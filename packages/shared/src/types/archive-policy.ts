/** 永久保留独立于置顶；项目保护优先于单条会话设置。 */
export interface ProjectArchivePreference {
  keep?: boolean
  pinned?: boolean
  icon?: string
  color?: string
}
export interface ArchiveLogEntry {
  kind: 'agent' | 'chat'
  id: string
  title: string
  updatedAt: number
  restored?: boolean
}
export interface ArchiveBatch {
  id: string
  at: number
  entries: ArchiveLogEntry[]
}
export interface ArchivePolicy {
  projects: Record<string, ProjectArchivePreference>
  sessions: Record<string, boolean>
  batches: ArchiveBatch[]
}
export interface ArchivePolicyChange {
  scope: 'project' | 'agent' | 'chat'
  id: string
  keep?: boolean
  pinned?: boolean
  icon?: string
  color?: string
  restore?: boolean
}
export const ARCHIVE_POLICY_CHANNELS = {
  CHANGED: 'archive-policy:changed',
  CONFIRM: 'archive-policy:confirm',
  GET: 'archive-policy:get',
  SET: 'archive-policy:set',
  UNDO: 'archive-policy:undo',
} as const
