import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { ArchivePolicy, AgentSessionMeta, ConversationMeta, ArchivePolicyChange } from '@proma/shared'

const fixture = mkdtempSync(join(tmpdir(), 'proma-archive-policy-'))
mock.module('./config-paths', () => ({ getConfigDir: () => fixture }))
const { readArchivePolicy, writeArchivePolicy, changeArchivePolicy, recordAutoArchive, shouldAutoArchive } = await import('./archive-policy')
const blank = (): ArchivePolicy => ({ projects: {}, sessions: {}, batches: [] })
const now = 100 * 86_400_000
const old = { id: 's', workspaceId: 'p', updatedAt: 0 }
beforeEach(() => writeArchivePolicy(blank()))
afterAll(() => rmSync(fixture, { recursive: true, force: true }))

describe('永久保留与自动归档', () => {
  test('Given 普通旧会话 When 达到阈值 Then 继续自动归档', () => {
    expect(shouldAutoArchive(blank(), 'agent', old, 7, now)).toBe(true)
    expect(shouldAutoArchive(blank(), 'chat', old, 7, now)).toBe(true)
  })
  test('Given 关闭自动归档 When 会话很旧 Then 保持活跃', () => {
    expect(shouldAutoArchive(blank(), 'agent', old, 0, now)).toBe(false)
  })
  test('Given 永久保留项目 When 已有或新会话超时 Then 均不归档', () => {
    changeArchivePolicy({ scope: 'project', id: 'p', keep: true })
    const persisted = readArchivePolicy()
    expect(shouldAutoArchive(persisted, 'agent', old, 7, now)).toBe(false)
    expect(shouldAutoArchive(persisted, 'agent', { ...old, id: 'future' }, 7, now)).toBe(false)
  })
  test('Given 项目保护 When 单条会话取消保护 Then 仍由项目保护', () => {
    changeArchivePolicy({ scope: 'project', id: 'p', keep: true })
    changeArchivePolicy({ scope: 'agent', id: 's', keep: false })
    expect(shouldAutoArchive(readArchivePolicy(), 'agent', old, 7, now)).toBe(false)
  })
  test('Given 单条保护 When 项目取消保护 Then 会话仍保留', () => {
    changeArchivePolicy({ scope: 'agent', id: 's', keep: true })
    changeArchivePolicy({ scope: 'project', id: 'p', keep: false })
    expect(shouldAutoArchive(readArchivePolicy(), 'agent', old, 7, now)).toBe(false)
  })
  test('Given 普通对话保护 When Agent ID相同 Then 不混淆两种会话', () => {
    changeArchivePolicy({ scope: 'chat', id: 's', keep: true })
    expect(shouldAutoArchive(readArchivePolicy(), 'chat', old, 7, now)).toBe(false)
    expect(shouldAutoArchive(readArchivePolicy(), 'agent', old, 7, now)).toBe(true)
  })
  test('Given 已取消所有保护 When 超时 Then 恢复自动归档', () => {
    changeArchivePolicy({ scope: 'project', id: 'p', keep: true })
    changeArchivePolicy({ scope: 'project', id: 'p', keep: false })
    expect(shouldAutoArchive(readArchivePolicy(), 'agent', old, 7, now)).toBe(true)
  })
  test('Given 草稿、置顶、已归档或新会话 Then 均不重复归档', () => {
    for (const patch of [{ isDraft: true }, { pinned: true }, { archived: true }, { updatedAt: now }]) {
      expect(shouldAutoArchive(blank(), 'agent', { ...old, ...patch }, 7, now)).toBe(false)
    }
    expect(shouldAutoArchive(blank(), 'agent', { ...old, updatedAt: now - 7 * 86_400_000 }, 7, now)).toBe(false)
  })
  test('Given 项目外观设置 When 保存后重新读取 Then 保留图标颜色置顶与保护', () => {
    changeArchivePolicy({ scope: 'project', id: 'p', keep: true, pinned: true, icon: '🎓', color: '#123456' })
    expect(readArchivePolicy().projects.p).toEqual({ keep: true, pinned: true, icon: '🎓', color: '#123456' })
  })
  test('Given 损坏的有效JSON When 读取保护 Then 报错而非放行归档', () => {
    writeFileSync(join(fixture, 'archive-policy.json'), '{}')
    expect(() => readArchivePolicy()).toThrow()
  })
  test('Given 自动归档 When 记录批次 Then 包含标题与原更新时间', () => {
    recordAutoArchive([{ kind: 'agent', id: 's', title: '重要工作', updatedAt: 42 }])
    expect(readArchivePolicy().batches[0]?.entries[0]?.title).toBe('重要工作')
    expect(readArchivePolicy().batches[0]?.entries[0]?.updatedAt).toBe(42)
  })
})

// IPC 测试使用内存会话索引，避免接触真实用户数据。
let agents: AgentSessionMeta[] = []
let chats: ConversationMeta[] = []
const handlers = new Map<string, (...args: unknown[]) => unknown>()
let confirmResponse = 0
mock.module('electron', () => ({
  ipcMain: { handle: (name: string, fn: (...args: unknown[]) => unknown) => handlers.set(name, fn) },
  dialog: { showMessageBox: async () => ({ response: confirmResponse }) },
}))
mock.module('./agent-workspace-manager', () => ({ listAgentWorkspaces: () => [{ id: 'p' }] }))
mock.module('./agent-session-manager', () => ({
  listAgentSessions: () => agents,
  updateAgentSessionMeta: (id: string, patch: Partial<AgentSessionMeta>) => {
    const s = agents.find(s => s.id === id)!
    Object.assign(s, patch, { updatedAt: Date.now() })
    return s
  },
}))
mock.module('./conversation-manager', () => ({
  listConversations: () => chats,
  updateConversationMeta: (id: string, patch: Partial<ConversationMeta>) => {
    const s = chats.find(s => s.id === id)!
    Object.assign(s, patch, { updatedAt: Date.now() })
    return s
  },
}))
const { registerArchivePolicyIpc } = await import('./archive-policy-ipc')
registerArchivePolicyIpc()
const call = async (action: string, ...args: unknown[]) => handlers.get(`archive-policy:${action}`)!(null, ...args)
const session = (id: string, workspaceId = 'p'): AgentSessionMeta => ({ id, workspaceId, title: id, createdAt: 1, updatedAt: 1, archived: true })

describe('归档恢复与撤销', () => {
  test('Given 项目多个归档会话 When 永久保留并恢复 Then 只恢复目标项目', async () => {
    agents = [session('a'), session('b'), session('c', 'other')]
    await call('set', { scope: 'project', id: 'p', keep: true, restore: true } satisfies ArchivePolicyChange)
    expect(agents.map(s => s.archived)).toEqual([false, false, true])
    expect(readArchivePolicy().projects.p?.keep).toBe(true)
  })
  test('Given 仅开启保护 When 未选择恢复 Then 不擅自恢复归档', async () => {
    agents = [session('a')]
    await call('set', { scope: 'project', id: 'p', keep: true })
    expect(agents[0]?.archived).toBe(true)
  })
  test('Given 一批归档后用户又修改部分会话 When 撤销 Then 仅恢复未改变的会话且可重复调用', async () => {
    agents = [session('a'), { ...session('b'), updatedAt: 2 }]
    recordAutoArchive(['a', 'b', 'deleted'].map(id => ({ kind: 'agent', id, title: id, updatedAt: 1 })))
    const id = readArchivePolicy().batches[0]!.id
    expect(await call('undo', id)).toMatchObject({ restored: 1 })
    expect(agents.map(s => s.archived)).toEqual([false, true])
    expect(await call('undo', id)).toMatchObject({ restored: 0 })
  })
  test('Given 项目保护 When 手动归档并取消 Then 不执行归档', async () => {
    agents = [{ ...session('a'), archived: false }]
    changeArchivePolicy({ scope: 'project', id: 'p', keep: true })
    confirmResponse = 0
    expect(await call('confirm', 'agent', 'a')).toBe(false)
    confirmResponse = 1
    expect(await call('confirm', 'agent', 'a')).toBe(true)
  })
})
