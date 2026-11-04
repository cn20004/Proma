import { describe, expect, test } from 'bun:test'
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
