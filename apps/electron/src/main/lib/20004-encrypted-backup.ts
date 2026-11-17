/**
 * Encrypted, explicitly allowlisted Proma configuration snapshots.
 * This service does not enumerate arbitrary directories, browser cookies,
 * API keys or operating-system credentials. The UI must supply the allowlist.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_TOTAL_BYTES = 16 * 1024 * 1024
const ALGORITHM = 'aes-256-gcm'
const VERSION = 1

type BackupFile = { path: string; data: string; sha256: string }
type PlainSnapshot = { version: 1; createdAt: string; files: BackupFile[] }
type EncryptedEnvelope = { version: 1; salt: string; iv: string; tag: string; ciphertext: string }

export interface RestorePreview {
  createdAt: string
  files: Array<{ path: string; bytes: number; exists: boolean }>
}

function relativeFilePath(path: string): string {
  if (!path || isAbsolute(path) || path.includes('\\') || path.includes(':') || path.includes('\0')) {
    throw new Error('Unsafe backup path')
  }
  const segments = path.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Unsafe backup path')
  }
  return path
}

function resolveSafe(root: string, path: string): string {
  const target = resolve(root, ...relativeFilePath(path).split('/'))
  const prefix = resolve(root) + sep
  if (!target.startsWith(prefix)) throw new Error('Backup path escapes target directory')
  // Existing symlinked parents are forbidden; no backup may escape through a symlink.
  let part = dirname(target)
  const rootPath = resolve(root)
  while (part !== rootPath && part.startsWith(prefix)) {
    if (existsSync(part) && lstatSync(part).isSymbolicLink()) throw new Error('Symlink parent not allowed')
    part = dirname(part)
  }
  if (existsSync(target) && !lstatSync(target).isFile()) throw new Error('Target is not a regular file')
  return target
}

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

function encrypt(snapshot: PlainSnapshot, passphrase: string): EncryptedEnvelope {
  if (passphrase.length < 12) throw new Error('Backup passphrase must be at least 12 characters')
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = scryptSync(passphrase, salt, 32)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(snapshot)), cipher.final()])
  return {
    version: VERSION,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }
}

function decrypt(backupFile: string, passphrase: string): PlainSnapshot {
  const raw = readFileSync(backupFile)
  if (raw.length > MAX_TOTAL_BYTES * 2) throw new Error('Backup too large')
  const envelope = JSON.parse(raw.toString('utf8')) as EncryptedEnvelope
  if (envelope.version !== VERSION) throw new Error('Unsupported backup version')
  const salt = Buffer.from(envelope.salt, 'base64')
  const iv = Buffer.from(envelope.iv, 'base64')
  const tag = Buffer.from(envelope.tag, 'base64')
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted backup')
  const key = scryptSync(passphrase, salt, 32)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(),
  ])
  const snapshot = JSON.parse(plaintext.toString('utf8')) as PlainSnapshot
  if (snapshot.version !== VERSION || !Array.isArray(snapshot.files)) throw new Error('Invalid backup format')
  return snapshot
}

function verifiedFiles(snapshot: PlainSnapshot, allowedPaths: readonly string[]): Array<{ path: string; bytes: Buffer }> {
  const permitted = new Set(allowedPaths.map(relativeFilePath))
  const found = new Set<string>()
  let total = 0
  return snapshot.files.map((file) => {
    const path = relativeFilePath(file.path)
    if (!permitted.has(path) || found.has(path)) throw new Error('File not on restore allowlist')
    found.add(path)
    const bytes = Buffer.from(file.data, 'base64')
    total += bytes.length
    if (bytes.length > MAX_FILE_BYTES || total > MAX_TOTAL_BYTES || sha256(bytes) !== file.sha256) {
      throw new Error('Backup file integrity check failed')
    }
    return { path, bytes }
  })
}

export function createEncryptedBackup(
  sourceDir: string, backupFile: string, relativePaths: readonly string[], passphrase: string,
): RestorePreview {
  const paths = [...new Set(relativePaths.map(relativeFilePath))]
  let total = 0
  const files: BackupFile[] = paths.map((path) => {
    const filename = resolveSafe(sourceDir, path)
    if (!existsSync(filename)) throw new Error(`Missing backup source: ${path}`)
    const bytes = readFileSync(filename)
    total += bytes.length
    if (bytes.length > MAX_FILE_BYTES || total > MAX_TOTAL_BYTES) throw new Error('Backup size limit exceeded')
    return { path, data: bytes.toString('base64'), sha256: sha256(bytes) }
  })
  const snapshot: PlainSnapshot = { version: VERSION, createdAt: new Date().toISOString(), files }
  const envelope = encrypt(snapshot, passphrase)
  mkdirSync(dirname(backupFile), { recursive: true })
  const temporary = backupFile + '.' + randomBytes(6).toString('hex') + '.tmp'
  try {
    writeFileSync(temporary, JSON.stringify(envelope), { mode: 0o600, flag: 'wx' })
    renameSync(temporary, backupFile)
  } finally {
    if (existsSync(temporary)) rmSync(temporary)
  }
  return { createdAt: snapshot.createdAt, files: files.map((file) => ({
    path: file.path, bytes: Buffer.from(file.data, 'base64').length, exists: true,
  })) }
}

/**
 * Dry-run is the default. Caller must explicitly set apply=true after preview
 * and stop running services that might write the same files.
 */
export function restoreEncryptedBackup(
  targetDir: string, backupFile: string, passphrase: string,
  allowedPaths: readonly string[], apply = false,
): RestorePreview {
  const snapshot = decrypt(backupFile, passphrase)
  const files = verifiedFiles(snapshot, allowedPaths)
  const preview: RestorePreview = {
    createdAt: snapshot.createdAt,
    files: files.map((file) => ({ path: file.path, bytes: file.bytes.length, exists: existsSync(resolveSafe(targetDir, file.path)) })),
  }
  if (!apply) return preview

  // Preflight all targets and stage prior contents before changing any file.
  const original = files.map((file) => {
    const path = resolveSafe(targetDir, file.path)
    return { path, bytes: existsSync(path) ? readFileSync(path) : null }
  })
  const changed: number[] = []
  try {
    files.forEach((file, index) => {
      const path = resolveSafe(targetDir, file.path)
      mkdirSync(dirname(path), { recursive: true })
      const tmp = path + '.' + randomBytes(6).toString('hex') + '.tmp'
      try {
        writeFileSync(tmp, file.bytes, { mode: 0o600, flag: 'wx' })
        renameSync(tmp, path)
      } finally {
        if (existsSync(tmp)) rmSync(tmp)
      }
      changed.push(index)
    })
  } catch (error) {
    for (const index of changed.reverse()) {
      const entry = original[index]
      if (entry.bytes === null) rmSync(entry.path, { force: true })
      else writeFileSync(entry.path, entry.bytes)
    }
    throw error
  }
  return preview
}
