import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { RemotePairing } from './pairing'
import { DEFAULT_REMOTE_ACCESS_SETTINGS, parseRemoteAccessSettings, type RemoteAccessSettings } from './settings'

export interface RemoteServiceStatus {
  running: boolean
  address: string | null
  connections: number
}

export interface RemoteAgentTask {
  id: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  result?: string
  error?: string
}

/** Desktop-side adapter must explicitly approve and scope each task. No generic IPC bridge. */
export interface RemoteAgentBridge {
  listAgents(): Promise<Array<{ id: string; label: string; status: string }>>
  submitTask(input: { workspaceId: string; prompt: string }): Promise<{ id: string }>
  getTask(id: string): Promise<RemoteAgentTask | null>
}

export class RemoteAccessService {
  private server: Server | null = null
  private token: Buffer | null = null
  private settings: RemoteAccessSettings = DEFAULT_REMOTE_ACCESS_SETTINGS
  private connections = 0
  private readonly pairing = new RemotePairing()

  constructor(private readonly agentBridge?: RemoteAgentBridge) {}

  status(): RemoteServiceStatus {
    return {
      running: this.server !== null,
      address: this.server ? `http://127.0.0.1:${this.settings.port}` : null,
      connections: this.connections,
    }
  }

  /** Invoke from trusted desktop UI only; never expose the pairing code over HTTP. */
  createPairingCode(): string {
    if (!this.server) throw new Error('Remote service is not running')
    return this.pairing.createCode()
  }

  listPairedDevices(): ReturnType<RemotePairing['listDevices']> {
    return this.pairing.listDevices()
  }

  revokeDevice(deviceId: string): boolean {
    return this.pairing.revoke(deviceId)
  }

  async start(rawSettings: unknown): Promise<{ status: RemoteServiceStatus; token: string }> {
    if (this.server) throw new Error('Remote service is already running')
    const settings = parseRemoteAccessSettings(rawSettings)
    if (!settings.enabled) throw new Error('Remote access is disabled')
    // Loopback only. External access requires a separately authenticated TLS tunnel.
    const token = randomBytes(32).toString('base64url')
    this.token = Buffer.from(token)
    this.settings = settings
    const server = createServer((request, response) => {
      void this.handle(request, response).catch(() => {
        if (!response.headersSent) this.reply(response, 500, { error: 'internal_error' })
        else response.destroy()
      })
    })
    server.headersTimeout = 10000
    server.requestTimeout = 15000
    server.keepAliveTimeout = 5000
    server.maxHeadersCount = 40
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(settings.port, '127.0.0.1', () => {
          server.off('error', reject)
          resolve()
        })
      })
      this.server = server
      return { status: this.status(), token }
    } catch (error) {
      this.token = null
      server.close()
      throw error
    }
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = null
    this.token = null
    this.pairing.revokeAll()
    if (!server) return
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  private authorized(request: IncomingMessage): boolean {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) return false
    const candidate = header.slice(7)
    if (candidate.length > 128) return false
    const bytes = Buffer.from(candidate)
    if (this.token && bytes.length === this.token.length && timingSafeEqual(bytes, this.token)) return true
    return this.pairing.verify(candidate)
  }

  private reply(response: ServerResponse, code: number, payload: unknown): void {
    response.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'Referrer-Policy': 'no-referrer',
      'Access-Control-Allow-Origin': 'null',
    })
    response.end(JSON.stringify(payload))
  }

  private async readJson(request: IncomingMessage): Promise<Record<string, unknown> | null> {
    const chunks: Buffer[] = []
    let total = 0
    for await (const chunk of request) {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      total += data.length
      if (total > 8192) return null
      chunks.push(data)
    }
    try {
      const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown> : null
    } catch {
      return null
    }
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    this.connections++
    response.once('close', () => { this.connections-- })
    const pathname = request.url?.split('?')[0] ?? ''
    if (request.method === 'GET' && pathname === '/health') {
      this.reply(response, 200, { service: 'proma-remote', ready: true })
      return
    }

    // Pairing is the only endpoint accepting a one-time code without Bearer auth.
    if (request.method === 'POST' && pathname === '/api/v1/pair') {
      const body = await this.readJson(request)
      if (!body || typeof body.code !== 'string' || typeof body.label !== 'string') {
        this.reply(response, 400, { error: 'invalid_request' })
        return
      }
      const deviceToken = this.pairing.pair(body.code, body.label)
      this.reply(response, deviceToken ? 200 : 403, deviceToken ? { token: deviceToken } : { error: 'pairing_denied' })
      return
    }

    if (!this.authorized(request)) {
      this.reply(response, 401, { error: 'unauthorized' })
      return
    }
    if (request.method === 'GET' && pathname === '/api/v1/status') {
      this.reply(response, 200, {
        running: true,
        transport: this.settings.transport,
        capabilities: {
          agent: Boolean(this.settings.allowAgentExecution && this.agentBridge),
          browser: false,
          files: false,
        },
      })
      return
    }
    if (!this.settings.allowAgentExecution || !this.agentBridge) {
      this.reply(response, 403, { error: 'agent_access_disabled' })
      return
    }
    if (request.method === 'GET' && pathname === '/api/v1/agents') {
      this.reply(response, 200, { agents: await this.agentBridge.listAgents() })
      return
    }
    if (request.method === 'POST' && pathname === '/api/v1/tasks') {
      const body = await this.readJson(request)
      if (!body || typeof body.workspaceId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(body.workspaceId) ||
        typeof body.prompt !== 'string' || body.prompt.trim().length < 1 || body.prompt.length > 4000) {
        this.reply(response, 400, { error: 'invalid_task' })
        return
      }
      const task = await this.agentBridge.submitTask({ workspaceId: body.workspaceId, prompt: body.prompt })
      this.reply(response, 202, { id: task.id, status: 'queued' })
      return
    }
    if (request.method === 'GET' && /^\/api\/v1\/tasks\/[a-zA-Z0-9_-]{1,128}$/.test(pathname)) {
      const task = await this.agentBridge.getTask(pathname.slice('/api/v1/tasks/'.length))
      this.reply(response, task ? 200 : 404, task ?? { error: 'not_found' })
      return
    }
    this.reply(response, 404, { error: 'not_found' })
  }
}
