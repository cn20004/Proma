import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { DEFAULT_REMOTE_ACCESS_SETTINGS, parseRemoteAccessSettings, type RemoteAccessSettings } from './settings'

export interface RemoteServiceStatus {
  running: boolean
  address: string | null
  connections: number
}

export class RemoteAccessService {
  private server: Server | null = null
  private token: Buffer | null = null
  private settings: RemoteAccessSettings = DEFAULT_REMOTE_ACCESS_SETTINGS
  private connections = 0

  status(): RemoteServiceStatus {
    return {
      running: this.server !== null,
      address: this.server ? `http://127.0.0.1:${this.settings.port}` : null,
      connections: this.connections,
    }
  }

  async start(rawSettings: unknown): Promise<{ status: RemoteServiceStatus; token: string }> {
    if (this.server) throw new Error('Remote service is already running')
    const settings = parseRemoteAccessSettings(rawSettings)
    if (!settings.enabled) throw new Error('Remote access is disabled')
    // This service is local-only. A separate authenticated tunnel is required for external access.
    const token = randomBytes(32).toString('base64url')
    this.token = Buffer.from(token)
    this.settings = settings
    const server = createServer((request, response) => this.handle(request, response))
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
    if (!server) return
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  private authorized(request: IncomingMessage): boolean {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ') || !this.token) return false
    const candidate = Buffer.from(header.slice(7))
    return candidate.length === this.token.length && timingSafeEqual(candidate, this.token)
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

  private handle(request: IncomingMessage, response: ServerResponse): void {
    this.connections += 1
    response.once('close', () => { this.connections -= 1 })
    if (request.method !== 'GET') {
      this.reply(response, 405, { error: 'method_not_allowed' })
      return
    }
    if (request.url === '/health') {
      // No project data, secrets or account details are returned to unauthenticated clients.
      this.reply(response, 200, { service: 'proma-remote', ready: true })
      return
    }
    if (!this.authorized(request)) {
      this.reply(response, 401, { error: 'unauthorized' })
      return
    }
    if (request.url === '/api/v1/status') {
      this.reply(response, 200, {
        running: true,
        transport: this.settings.transport,
        capabilities: {
          agent: false,
          browser: false,
          files: false,
        },
      })
      return
    }
    // Fail closed: never expose IPC, filesystem, browser sessions or Agent via generic routes.
    this.reply(response, 404, { error: 'not_found' })
  }
}
