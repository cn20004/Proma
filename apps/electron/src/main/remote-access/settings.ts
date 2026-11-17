/**
 * Remote access configuration. Remote access is opt-in and disabled by default.
 * This module contains no network listener and does not expose Agent capabilities.
 */
export type RemoteTransport = 'local' | 'tailscale' | 'cloudflare'

export interface RemoteAccessSettings {
  enabled: boolean
  startWithApp: boolean
  transport: RemoteTransport
  host: '127.0.0.1'
  port: number
  sessionIdleMinutes: number
  requireAuthentication: true
  allowAgentExecution: boolean
  allowBrowserAutomation: boolean
  allowFileAccess: boolean
  auditLogging: boolean
  cloudflare: {
    hostname: string
    tunnelId: string
    credentialsPath: string
    reconnect: boolean
  }
}

export const DEFAULT_REMOTE_ACCESS_SETTINGS: RemoteAccessSettings = {
  enabled: false,
  startWithApp: false,
  transport: 'local',
  host: '127.0.0.1',
  port: 18765,
  sessionIdleMinutes: 15,
  requireAuthentication: true,
  allowAgentExecution: false,
  allowBrowserAutomation: false,
  allowFileAccess: false,
  auditLogging: true,
  cloudflare: {
    hostname: '',
    tunnelId: '',
    credentialsPath: '',
    reconnect: false,
  },
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function parseRemoteAccessSettings(value: unknown): RemoteAccessSettings {
  const input = record(value)
  const tunnel = record(input.cloudflare)
  const defaults = DEFAULT_REMOTE_ACCESS_SETTINGS
  const port = input.port
  const idle = input.sessionIdleMinutes
  const transport = input.transport
  return {
    enabled: flag(input.enabled, defaults.enabled),
    startWithApp: flag(input.startWithApp, defaults.startWithApp),
    transport: transport === 'tailscale' || transport === 'cloudflare' ? transport : 'local',
    // Never accept an arbitrary bind address from persisted settings.
    host: '127.0.0.1',
    port: typeof port === 'number' && Number.isInteger(port) && port >= 1024 && port <= 65535
      ? port : defaults.port,
    sessionIdleMinutes: typeof idle === 'number' && Number.isInteger(idle) && idle >= 1 && idle <= 1440
      ? idle : defaults.sessionIdleMinutes,
    requireAuthentication: true,
    allowAgentExecution: flag(input.allowAgentExecution, false),
    allowBrowserAutomation: flag(input.allowBrowserAutomation, false),
    allowFileAccess: flag(input.allowFileAccess, false),
    auditLogging: flag(input.auditLogging, true),
    cloudflare: {
      hostname: typeof tunnel.hostname === 'string' ? tunnel.hostname.trim().slice(0, 253) : '',
      tunnelId: typeof tunnel.tunnelId === 'string' ? tunnel.tunnelId.trim().slice(0, 128) : '',
      credentialsPath: typeof tunnel.credentialsPath === 'string' ? tunnel.credentialsPath.trim().slice(0, 4096) : '',
      reconnect: flag(tunnel.reconnect, false),
    },
  }
}

export function remoteAccessCanStart(settings: RemoteAccessSettings): boolean {
  if (!settings.enabled || !settings.requireAuthentication) return false
  if (settings.transport === 'cloudflare') {
    return Boolean(settings.cloudflare.hostname && settings.cloudflare.tunnelId && settings.cloudflare.credentialsPath)
  }
  return true
}
