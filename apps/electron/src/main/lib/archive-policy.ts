import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import type { ArchivePolicy, ArchiveLogEntry, ArchivePolicyChange } from '@proma/shared'
import { getConfigDir } from './config-paths'
import { readJsonFileSafe, writeJsonFileAtomic } from './safe-file'

const policyPath = (): string => join(getConfigDir(), 'archive-policy.json')
export function readArchivePolicy(): ArchivePolicy {
  const path = policyPath()
  const policy = readJsonFileSafe<ArchivePolicy>(path)
  // 损坏时停止自动归档，不能静默丢失用户的保护设置。
  if (!policy && existsSync(path)) throw new Error('归档保护配置损坏，请恢复备份后重试')
  if (policy && (!policy.projects || !policy.sessions || !Array.isArray(policy.batches))) throw new Error('归档保护配置格式无效')
  return policy ?? { projects: {}, sessions: {}, batches: [] }
}
export function writeArchivePolicy(policy: ArchivePolicy): void {
  writeJsonFileAtomic(policyPath(), policy)
}
export function isArchiveProtected(policy: ArchivePolicy, kind: 'agent' | 'chat', id: string, workspaceId?: string): boolean {
  return !!policy.sessions[`${kind}:${id}`] || (kind === 'agent' && !!workspaceId && !!policy.projects[workspaceId]?.keep)
}
export function shouldAutoArchive(policy: ArchivePolicy, kind: 'agent' | 'chat', session: { id: string; workspaceId?: string; pinned?: boolean; archived?: boolean; isDraft?: boolean; updatedAt: number }, days: number, now = Date.now()): boolean {
  return days > 0 && !session.isDraft && !session.pinned && !session.archived
    && !isArchiveProtected(policy, kind, session.id, session.workspaceId)
    && session.updatedAt < now - days * 86_400_000
}
export function changeArchivePolicy(change: ArchivePolicyChange): ArchivePolicy {
  if (!change.id || !['project', 'agent', 'chat'].includes(change.scope)) throw new Error('无效的归档设置')
  const policy = readArchivePolicy()
  if (change.scope === 'project') {
    const pref = { ...policy.projects[change.id] }
    if (typeof change.keep === 'boolean') pref.keep = change.keep
    if (typeof change.pinned === 'boolean') pref.pinned = change.pinned
    if (typeof change.icon === 'string') pref.icon = change.icon.slice(0, 16)
    if (typeof change.color === 'string' && /^(#[0-9a-f]{6})?$/i.test(change.color)) pref.color = change.color
    policy.projects[change.id] = pref
  } else if (typeof change.keep === 'boolean') {
    policy.sessions[`${change.scope}:${change.id}`] = change.keep
  }
  writeArchivePolicy(policy)
  return policy
}
/** 先记录再改索引；崩溃后也能查到候选记录，撤销会再次核对实际状态。 */
export function recordAutoArchive(entries: ArchiveLogEntry[]): void {
  if (!entries.length) return
  const policy = readArchivePolicy()
  policy.batches.unshift({ id: randomUUID(), at: Date.now(), entries })
  policy.batches = policy.batches.slice(0, 100)
  writeArchivePolicy(policy)
}
