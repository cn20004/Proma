import { describe, expect, test } from 'bun:test'
import { createServer } from 'node:http'
import { RemoteAccessService, type RemoteAgentBridge } from './server'
import { RemotePairing } from './pairing'
import { DEFAULT_REMOTE_ACCESS_SETTINGS, parseRemoteAccessSettings } from './settings'

describe('remote access defaults', () => {
  test('defaults are disabled and loopback-only', () => {
    expect(DEFAULT_REMOTE_ACCESS_SETTINGS.enabled).toBe(false)
    expect(DEFAULT_REMOTE_ACCESS_SETTINGS.host).toBe('127.0.0.1')
    expect(DEFAULT_REMOTE_ACCESS_SETTINGS.allowAgentExecution).toBe(false)
  })
  test('rejects unsafe persisted values', () => {
    const settings = parseRemoteAccessSettings({
      enabled: true, host: '0.0.0.0', requireAuthentication: false,
      port: 22, sessionIdleMinutes: -1,
    })
    expect(settings.host).toBe('127.0.0.1')
    expect(settings.requireAuthentication).toBe(true)
    expect(settings.port).toBe(18765)
    expect(settings.sessionIdleMinutes).toBe(15)
  })
})

describe('device pairing', () => {
  test('one-time codes, expiry and device revocation', () => {
    const pairing = new RemotePairing()
    const code = pairing.createCode(1000)
    expect(pairing.pair('00000000' === code ? '99999999' : '00000000', 'iPhone', 1001)).toBeNull()
    const token = pairing.pair(code, 'iPhone', 1002)
    expect(token).not.toBeNull()
    expect(pairing.pair(code, 'other', 1003)).toBeNull()
    expect(pairing.verify(token!, 1004)).toBe(true)
    const device = pairing.listDevices()[0]
    expect(pairing.revoke(device.id)).toBe(true)
    expect(pairing.verify(token!, 1005)).toBe(false)
  })
  test('code expires and locks after five attempts', () => {
    const pairing = new RemotePairing()
    const code = pairing.createCode(1000)
    expect(pairing.pair(code, 'iPhone', 121001)).toBeNull()
    pairing.createCode(2000)
    for (let i = 0; i < 5; i++) pairing.pair('xxxxxxxx', 'unknown', 2001)
    expect(pairing.pair(code, 'iPhone', 2002)).toBeNull()
  })
})

async function unusedPort(): Promise<number> {
  const probe = createServer()
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const address = probe.address()
  if (!address || typeof address === 'string') throw new Error('Could not select test port')
  await new Promise<void>((resolve) => probe.close(() => resolve()))
  return address.port
}

describe('authenticated remote task bridge', () => {
  test('pairing, read-only status, scoped task creation and revocation', async () => {
    const tasks = new Map<string, { id: string; status: 'queued' }>()
    const bridge: RemoteAgentBridge = {
      listAgents: async () => [{ id: 'agent1', label: 'Agent 1', status: 'idle' }],
      submitTask: async ({ workspaceId, prompt }) => {
        expect(workspaceId).toBe('project1')
        expect(prompt).toBe('hello')
        const task = { id: 'task1', status: 'queued' as const }
        tasks.set(task.id, task)
        return { id: task.id }
      },
      getTask: async (id) => tasks.get(id) ?? null,
    }
    const service = new RemoteAccessService(bridge)
    const port = await unusedPort()
    const url = `http://127.0.0.1:${port}`
    try {
      await service.start({ enabled: true, port, allowAgentExecution: true })
      const unauthorized = await fetch(`${url}/api/v1/agents`)
      expect(unauthorized.status).toBe(401)

      const code = service.createPairingCode()
      const paired = await fetch(`${url}/api/v1/pair`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, label: 'iPhone' }),
      })
      expect(paired.status).toBe(200)
      const token = (await paired.json() as { token: string }).token
      const authorization = { Authorization: `Bearer ${token}` }
      expect((await fetch(`${url}/api/v1/agents`, { headers: authorization })).status).toBe(200)
      const invalid = await fetch(`${url}/api/v1/tasks`, {
        method: 'POST', headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: '../secret', prompt: 'hello' }),
      })
      expect(invalid.status).toBe(400)
      const queued = await fetch(`${url}/api/v1/tasks`, {
        method: 'POST', headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'project1', prompt: 'hello' }),
      })
      expect(queued.status).toBe(202)
      expect((await fetch(`${url}/api/v1/tasks/task1`, { headers: authorization })).status).toBe(200)
      const device = service.listPairedDevices()[0]
      expect(service.revokeDevice(device.id)).toBe(true)
      expect((await fetch(`${url}/api/v1/agents`, { headers: authorization })).status).toBe(401)
    } finally {
      await service.stop()
    }
  })

  test('Agent API remains disabled without explicit permission and a bridge', async () => {
    const service = new RemoteAccessService()
    const port = await unusedPort()
    try {
      const { token } = await service.start({ enabled: true, port, allowAgentExecution: true })
      const status = await fetch(`http://127.0.0.1:${port}/api/v1/status`, { headers: { Authorization: `Bearer ${token}` } })
      expect((await status.json() as { capabilities: { agent: boolean } }).capabilities.agent).toBe(false)
      const agents = await fetch(`http://127.0.0.1:${port}/api/v1/agents`, { headers: { Authorization: `Bearer ${token}` } })
      expect(agents.status).toBe(403)
    } finally {
      await service.stop()
    }
  })
})
