import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { getConfigDir } from './config-paths'

export interface DataSafetyStatus {
  configDir: string
  backupRoot: string
  latestBackupPath?: string
  latestBackupAt?: number
  backupCount: number
}

const BACKUP_ROOT_NAME = '.proma-backups'
const MAX_BACKUPS = 10
const AUTO_BACKUP_MIN_INTERVAL_MS = 20 * 60 * 60 * 1000

const CRITICAL_ENTRIES = [
  'settings.json',
  'channels.json',
  'agent-workspaces.json',
  'agent-workspaces',
  'agent-sessions.json',
  'agent-sessions',
  'conversations.json',
  'conversations',
  'attachments',
  'system-prompts.json',
  'chat-tools.json',
  'user-profile.json',
  'vault.json',
  'planning.json',
  'automations.json',
  '20004-hangzhou.json',
] as const

function getBackupRoot(): string {
  const root = join(homedir(), BACKUP_ROOT_NAME)
  if (!existsSync(root)) mkdirSync(root, { recursive: true })
  return root
}

function stamp(date = new Date()): string {
  const p = (v: number): string => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`
}

function listBackupDirs(): Array<{ path: string; mtimeMs: number }> {
  const root = getBackupRoot()
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('20004-'))
    .map((entry) => {
      const path = join(root, entry.name)
      return { path, mtimeMs: statSync(path).mtimeMs }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
}

function pruneOldBackups(): void {
  const backups = listBackupDirs()
  for (const backup of backups.slice(MAX_BACKUPS)) {
    try {
      rmSync(backup.path, { recursive: true, force: true })
    } catch (error) {
      console.warn('[20004 数据安全] 清理旧备份失败:', backup.path, error)
    }
  }
}

export function createDataSafetyBackup(reason: 'startup' | 'manual' = 'manual'): DataSafetyStatus {
  const source = getConfigDir()
  const target = join(getBackupRoot(), `20004-${stamp()}-${reason}`)
  mkdirSync(target, { recursive: true })

  let copied = 0
  for (const entry of CRITICAL_ENTRIES) {
    const from = join(source, entry)
    if (!existsSync(from)) continue
    try {
      cpSync(from, join(target, entry), { recursive: true, force: true, errorOnExist: false })
      copied += 1
    } catch (error) {
      console.warn('[20004 数据安全] 备份条目失败:', entry, error)
    }
  }

  if (copied === 0) {
    try { rmSync(target, { recursive: true, force: true }) } catch {}
  } else {
    console.log(`[20004 数据安全] 已创建${reason === 'startup' ? '启动' : '手动'}备份: ${target}`)
  }
  pruneOldBackups()
  return getDataSafetyStatus()
}

export function createAutomaticDataSafetyBackup(): DataSafetyStatus {
  const latest = listBackupDirs()[0]
  if (latest && Date.now() - latest.mtimeMs < AUTO_BACKUP_MIN_INTERVAL_MS) {
    return getDataSafetyStatus()
  }
  return createDataSafetyBackup('startup')
}

export function getDataSafetyStatus(): DataSafetyStatus {
  const backups = listBackupDirs()
  const latest = backups[0]
  return {
    configDir: getConfigDir(),
    backupRoot: getBackupRoot(),
    latestBackupPath: latest?.path,
    latestBackupAt: latest?.mtimeMs,
    backupCount: backups.length,
  }
}
