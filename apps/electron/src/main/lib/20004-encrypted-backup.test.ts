import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createEncryptedBackup, restoreEncryptedBackup } from './20004-encrypted-backup'

const roots: string[] = []
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'proma-backup-test-'))
  roots.push(root)
  const source = join(root, 'source')
  const destination = join(root, 'restore')
  const backup = join(root, 'snapshot.proma')
  mkdirSync(source, { recursive: true })
  mkdirSync(destination, { recursive: true })
  return { root, source, destination, backup }
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('20004 encrypted backup', () => {
  test('encrypts contents, previews before restoring and restores only allowlisted files', () => {
    const { source, destination, backup } = fixture()
    writeFileSync(join(source, 'settings.json'), '{"theme":"dark"}')
    createEncryptedBackup(source, backup, ['settings.json'], 'strong-passphrase-123')
    expect(readFileSync(backup, 'utf8')).not.toContain('dark')
    const before = restoreEncryptedBackup(destination, backup, 'strong-passphrase-123', ['settings.json'])
    expect(before.files[0].exists).toBe(false)
    const after = restoreEncryptedBackup(destination, backup, 'strong-passphrase-123', ['settings.json'], true)
    expect(after.files.length).toBe(1)
    expect(readFileSync(join(destination, 'settings.json'), 'utf8')).toBe('{"theme":"dark"}')
  })

  test('wrong passphrase, traversal and unlisted restore paths are rejected', () => {
    const { source, destination, backup } = fixture()
    writeFileSync(join(source, 'settings.json'), '{}')
    expect(() => createEncryptedBackup(source, backup, ['../secret'], 'strong-passphrase-123')).toThrow()
    createEncryptedBackup(source, backup, ['settings.json'], 'strong-passphrase-123')
    expect(() => restoreEncryptedBackup(destination, backup, 'wrong-password-123', ['settings.json'])).toThrow()
    expect(() => restoreEncryptedBackup(destination, backup, 'strong-passphrase-123', ['other.json'])).toThrow()
  })
})
