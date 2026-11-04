import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** One-time pairing codes are intentionally never persisted. */
export class RemotePairing {
  private digest: Buffer | null = null
  private expiresAt = 0
  private attempts = 0
  private readonly devices = new Map<string, { expiresAt: number; label: string }>()

  createCode(now = Date.now()): string {
    const code = String(randomBytes(4).readUInt32BE() % 100000000).padStart(8, '0')
    this.digest = createHash('sha256').update(code).digest()
    this.expiresAt = now + 2 * 60_000
    this.attempts = 0
    return code
  }

  pair(code: string, label: string, now = Date.now()): string | null {
    if (!this.digest || now >= this.expiresAt || this.attempts >= 5) return null
    this.attempts++
    if (!/^\d{8}$/.test(code)) return null
    const candidate = createHash('sha256').update(code).digest()
    if (!timingSafeEqual(candidate, this.digest)) return null
    this.digest = null
    const token = randomBytes(32).toString('base64url')
    this.devices.set(createHash('sha256').update(token).digest('hex'), {
      label: label.trim().slice(0, 80) || 'iPhone',
      expiresAt: now + 30 * 24 * 60 * 60_000,
    })
    return token
  }

  verify(token: string, now = Date.now()): boolean {
    if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) return false
    const key = createHash('sha256').update(token).digest('hex')
    const device = this.devices.get(key)
    if (!device) return false
    if (now >= device.expiresAt) {
      this.devices.delete(key)
      return false
    }
    return true
  }

  listDevices(): Array<{ id: string; label: string; expiresAt: number }> {
    return [...this.devices].map(([id, info]) => ({ id, ...info }))
  }

  revoke(id: string): boolean {
    return this.devices.delete(id)
  }

  revokeAll(): void {
    this.devices.clear()
    this.digest = null
  }
}
