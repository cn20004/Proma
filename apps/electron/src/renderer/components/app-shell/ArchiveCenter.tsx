import * as React from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { Archive, ShieldCheck, FolderOpen, Pin, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { AgentSessionMeta, ConversationMeta, ArchivePolicyChange } from '@proma/shared'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { archivePolicyAtom, archiveCenterAtom } from '@/atoms/archive-policy'
import { agentSessionsAtom, agentWorkspacesAtom } from '@/atoms/agent-atoms'
import { conversationsAtom } from '@/atoms/chat-atoms'
import { useOpenSession } from '@/hooks/useOpenSession'
import { activeViewAtom } from '@/atoms/active-view'

/** 与列表共享刷新，不将完整归档列表长期留在侧栏 atom 中。 */
export function useArchiveActions() {
  const [policy, setPolicy] = useAtom(archivePolicyAtom)
  const setAgents = useSetAtom(agentSessionsAtom)
  const setChats = useSetAtom(conversationsAtom)
  const refresh = React.useCallback(async () => {
    const [next, agents, chats] = await Promise.all([
      window.electronAPI.getArchivePolicy(), window.electronAPI.listActiveAgentSessions(), window.electronAPI.listConversations(),
    ])
    setPolicy(next); setAgents(agents); setChats(chats)
    window.dispatchEvent(new Event('archive-policy-changed'))
  }, [setPolicy, setAgents, setChats])
  const change = async (input: ArchivePolicyChange) => {
    try {
      await window.electronAPI.setArchivePolicy(input)
      await refresh()
      toast.success(input.restore ? '已恢复会话并保存设置' : '已保存设置')
    } catch (error) { toast.error(`保存失败：${String(error)}`) }
  }
  return { policy, change, refresh }
}

export function ArchiveCenter(): React.ReactElement {
  const [center, setCenter] = useAtom(archiveCenterAtom)
  const [workspaces] = useAtom(agentWorkspacesAtom)
  const { policy, change, refresh } = useArchiveActions()
  const setPolicy = useSetAtom(archivePolicyAtom)
  const [agents, setAgents] = React.useState<AgentSessionMeta[]>([])
  const [chats, setChats] = React.useState<ConversationMeta[]>([])
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState('all')
  const [logs, setLogs] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const openSession = useOpenSession()
  const setActiveView = useSetAtom(activeViewAtom)
  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [a, c, p] = await Promise.all([window.electronAPI.listAgentSessions(), window.electronAPI.listConversations(), window.electronAPI.getArchivePolicy()])
      setAgents(a); setChats(c); setPolicy(p)
    } catch (error) { toast.error(`读取会话失败：${String(error)}`) }
    finally { setLoading(false) }
  }, [setPolicy])
  React.useEffect(() => {
    if (center.open) { void load(); setLogs(!!center.showLogs); setQuery(''); setFilter('all') }
  }, [center.open, center.projectId, center.showLogs, load])
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn(); await load() }
    catch (error) { toast.error(String(error)) }
    finally { setBusy(false) }
  }
  const project = workspaces.find(w => w.id === center.projectId)
  const pref = project ? policy.projects[project.id] ?? {} : {}
  const rows = [
    ...agents.filter(s => !s.isDraft).map(s => ({ ...s, kind: 'agent' as const })),
    ...chats.map(s => ({ ...s, kind: 'chat' as const, workspaceId: undefined })),
  ].filter(s => (!center.projectId || s.workspaceId === center.projectId)
    && (filter === 'all' || (filter === 'archived' ? s.archived : !s.archived))
    && `${s.title} ${workspaces.find(w => w.id === s.workspaceId)?.name ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt)
  return <>
    <button className="mx-3 my-1 flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-foreground/5 titlebar-no-drag" onClick={() => { setLogs(false); setCenter({ open: true }) }}>
      <FolderOpen size={15} />项目与会话 · 永久保留
    </button>
    {policy.batches[0] && <button className="mx-3 mb-2 text-left text-[11px] text-muted-foreground titlebar-no-drag" onClick={() => { setCenter({ open: true, showLogs: true }) }}>
      最近自动归档 {policy.batches[0].entries.length} 条 · 查看与撤销
    </button>}
    <Dialog open={center.open} onOpenChange={open => setCenter({ ...center, open })}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        <DialogTitle>{project ? `${pref.icon || '📁'} ${project.name}` : '项目与会话'}</DialogTitle>
        <DialogDescription>重要工作永久保留；在同一个项目里查看进行中和已归档会话。</DialogDescription>
        <div className="flex flex-wrap gap-2 items-center">
          <select aria-label="选择项目" className="bg-background border rounded p-2 text-sm max-w-64" value={center.projectId ?? ''} onChange={e => setCenter({ open: true, projectId: e.target.value || undefined })}>
            <option value="">全部项目和普通对话</option>
            {[...workspaces].sort((a,b) => Number(!!policy.projects[b.id]?.pinned)-Number(!!policy.projects[a.id]?.pinned)).map(w => <option key={w.id} value={w.id}>{policy.projects[w.id]?.pinned ? '📌 ' : ''}{policy.projects[w.id]?.icon || '📁'} {w.name}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => setLogs(!logs)}>{logs ? '返回会话' : `自动归档记录 (${policy.batches.length})`}</Button>
        </div>
        {project && !logs && <div className="flex flex-wrap gap-3 items-center rounded-md bg-muted p-3 text-sm">
          <label className="flex gap-1 items-center"><input disabled={busy} type="checkbox" checked={!!pref.keep} onChange={e => void run(() => change({ scope: 'project', id: project.id, keep: e.target.checked }))} />永不自动归档</label>
          <label className="flex gap-1 items-center"><input disabled={busy} type="checkbox" checked={!!pref.pinned} onChange={e => void run(() => change({ scope: 'project', id: project.id, pinned: e.target.checked }))} />项目置顶</label>
          <label>图标 <select aria-label="项目图标" disabled={busy} className="bg-background border rounded" value={pref.icon || '📁'} onChange={e => void run(() => change({ scope: 'project', id: project.id, icon: e.target.value }))}>{['📁','⭐','💼','🎓','🚀','💡','🛠️','🎬','📚','🌐'].map(icon => <option key={icon}>{icon}</option>)}</select></label>
          <label className="flex gap-1 items-center">颜色 <input aria-label="项目颜色" disabled={busy} type="color" className="w-8 h-7" value={pref.color || '#3b82f6'} onChange={e => void run(() => change({ scope: 'project', id: project.id, color: e.target.value }))} /></label>
          <Button disabled={busy} variant="outline" size="sm" onClick={() => void run(() => change({ scope: 'project', id: project.id, keep: true, restore: true }))}>永久保留并恢复已归档会话</Button>
        </div>}
        {!logs && <div className="flex gap-2 items-center"><Search size={16} /><input aria-label="搜索全部会话标题和项目" className="flex-1 min-w-0 border rounded bg-background px-3 py-2 text-sm" placeholder="搜索标题或项目名称，包含归档会话" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="会话状态" className="bg-background border rounded p-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">全部</option><option value="active">进行中</option><option value="archived">已归档</option></select></div>}
        <div className="min-h-0 flex-1 overflow-auto space-y-2" aria-busy={loading || busy}>
          {logs ? <>
            <p className="text-xs text-muted-foreground">保留最近100批记录，仅记录升级后的自动归档。撤销不会覆盖之后的手动操作。</p>
            {policy.batches.length === 0 && <p className="p-6 text-sm">暂无自动归档记录。</p>}
            {policy.batches.map(batch => <div key={batch.id} className="border rounded p-3"><div className="flex justify-between items-center text-sm"><span>{new Date(batch.at).toLocaleString()} · {batch.entries.length} 条</span><Button size="sm" variant="outline" disabled={busy || batch.entries.every(e => e.restored)} onClick={() => void run(async () => { const result = await window.electronAPI.undoAutoArchive(batch.id); await refresh(); toast.success(`已恢复 ${result.restored} 条会话`) })}>撤销本次归档</Button></div><ul className="text-xs text-muted-foreground mt-2 space-y-1">{batch.entries.map(e => <li key={`${e.kind}:${e.id}`}>{e.title}{e.restored ? ' · 已恢复' : ''}</li>)}</ul></div>)}
          </> : loading ? <p className="p-6">正在加载…</p> : <>
            <p className="text-xs text-muted-foreground">共 {rows.length} 条会话</p>
            {!rows.length && <p className="p-6 text-sm">没有符合条件的会话，试试“全部”或其他关键词。</p>}
            {rows.map(s => {
              const inherited = s.kind === 'agent' && !!s.workspaceId && !!policy.projects[s.workspaceId]?.keep
              const kept = inherited || !!policy.sessions[`${s.kind}:${s.id}`]
              const ws = workspaces.find(w => w.id === s.workspaceId)
              return <div key={`${s.kind}:${s.id}`} className="border rounded-md p-3 flex gap-3 items-center">
                <button className="flex-1 min-w-0 text-left" onClick={() => { setCenter({ ...center, open: false }); setActiveView('conversations'); openSession(s.kind, s.id, s.title, { sessionMeta: s.kind === 'agent' ? s : undefined }) }}><div className="text-sm font-medium truncate">{s.title}</div><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1"><span>{ws?.name ?? '普通对话'}</span><span>{s.archived ? '已归档' : '进行中'}</span>{kept && <span className="text-primary flex gap-1"><ShieldCheck size={12} />{inherited ? '项目永久保留' : '永久保留'}</span>}{s.pinned && <Pin size={12} />}</div></button>
                <Button size="sm" variant="outline" disabled={busy || inherited} onClick={() => void run(() => change({ scope: s.kind, id: s.id, keep: !kept }))}>{kept ? '取消保留' : '永久保留'}</Button>
                {s.archived && <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => change({ scope: s.kind, id: s.id, restore: true }))}><Archive size={13} />恢复</Button>}
              </div>
            })}
          </>}
        </div>
      </DialogContent>
    </Dialog>
  </>
}
