import { ipcMain, dialog } from 'electron'
import { ARCHIVE_POLICY_CHANNELS } from '@proma/shared'
import type { ArchivePolicyChange } from '@proma/shared'
import { readArchivePolicy, writeArchivePolicy, changeArchivePolicy, isArchiveProtected } from './archive-policy'
import { listAgentSessions, updateAgentSessionMeta } from './agent-session-manager'
import { listConversations, updateConversationMeta } from './conversation-manager'
import { listAgentWorkspaces } from './agent-workspace-manager'

export function registerArchivePolicyIpc(): void {
  ipcMain.handle(ARCHIVE_POLICY_CHANNELS.CONFIRM, async (_, kind: 'agent' | 'chat', id: string) => {
    const agents = listAgentSessions()
    const current = (kind === 'agent' ? agents : listConversations()).find(s => s.id === id)
    if (!current || current.archived) return true
    const policy = readArchivePolicy()
    const affected = new Set([id])
    if (kind === 'agent') {
      let previous = 0
      while (previous !== affected.size) {
        previous = affected.size
        for (const s of agents) if (s.parentSessionId && affected.has(s.parentSessionId)) affected.add(s.id)
      }
    }
    const protectedItems = kind === 'agent'
      ? agents.some(s => affected.has(s.id) && isArchiveProtected(policy, kind, s.id, s.workspaceId))
      : isArchiveProtected(policy, kind, id)
    if (!protectedItems) return true
    const result = await dialog.showMessageBox({ type: 'question', title: '归档永久保留的会话？', message: '该会话或子会话已设置永久保留。仍要手动归档吗？', detail: '永久保留阻止自动归档，手动归档后仍可在项目的“全部会话”中找回。', buttons: ['取消', '仍然归档'], defaultId: 0, cancelId: 0 })
    return result.response === 1
  })
  ipcMain.handle(ARCHIVE_POLICY_CHANNELS.GET, () => readArchivePolicy())
  ipcMain.handle(ARCHIVE_POLICY_CHANNELS.SET, (_, change: ArchivePolicyChange) => {
    const agents = listAgentSessions()
    const chats = listConversations()
    const exists = change.scope === 'project' ? listAgentWorkspaces().some(w => w.id === change.id)
      : (change.scope === 'agent' ? agents : chats).some(s => s.id === change.id)
    if (!exists) throw new Error('项目或会话不存在')
    changeArchivePolicy(change)
    if (change.restore) {
      if (change.scope !== 'chat') {
        for (const s of agents) {
          if (s.archived && (change.scope === 'project' ? s.workspaceId === change.id : s.id === change.id)) {
            updateAgentSessionMeta(s.id, { archived: false })
          }
        }
      } else if (chats.find(s => s.id === change.id)?.archived) {
        updateConversationMeta(change.id, { archived: false })
      }
    }
    return readArchivePolicy()
  })
  ipcMain.handle(ARCHIVE_POLICY_CHANNELS.UNDO, (_, batchId: string) => {
    const policy = readArchivePolicy()
    const batch = policy.batches.find(b => b.id === batchId)
    if (!batch) throw new Error('归档记录不存在')
    const agentsById = new Map(listAgentSessions().map(s => [s.id, s]))
    const chatsById = new Map(listConversations().map(s => [s.id, s]))
    let restored = 0
    for (const entry of batch.entries) {
      if (entry.restored) continue
      const session = entry.kind === 'agent' ? agentsById.get(entry.id) : chatsById.get(entry.id)
      // 不覆盖归档之后用户手动操作、删除或重新归档的会话。
      if (!session?.archived || session.updatedAt !== entry.updatedAt) continue
      if (entry.kind === 'agent') updateAgentSessionMeta(entry.id, { archived: false })
      else updateConversationMeta(entry.id, { archived: false })
      entry.restored = true
      restored++
    }
    writeArchivePolicy(policy)
    return { policy, restored }
  })
}
