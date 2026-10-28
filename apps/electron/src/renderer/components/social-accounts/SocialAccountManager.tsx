import * as React from 'react'
import { useAtomValue } from 'jotai'
import { currentAgentSessionIdAtom } from '@/atoms/agent-atoms'
import { useProjectActions } from '@/hooks/useProjectActions'
import type { BrowserAccount, SocialPlatform } from '../../../main/lib/social-account-registry'

const PLATFORMS: Array<{ value: SocialPlatform; label: string }> = [
  { value: 'wechat-channels', label: '微信视频号' },
  { value: 'zhihu', label: '知乎' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'bilibili', label: '哔哩哔哩' },
  { value: 'other', label: '其他平台' },
]

export function SocialAccountManager(): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [accounts, setAccounts] = React.useState<BrowserAccount[]>([])
  const [selectedId, setSelectedId] = React.useState('')
  const [name, setName] = React.useState('')
  const [platform, setPlatform] = React.useState<SocialPlatform>('wechat-channels')
  const [legacyProject, setLegacyProject] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const sessionId = useAtomValue(currentAgentSessionIdAtom)
  const { workspaces } = useProjectActions()

  const refresh = React.useCallback(async () => {
    const list = await window.electronAPI.listSocialBrowserAccounts()
    setAccounts(list)
    if (sessionId) setSelectedId((await window.electronAPI.getSocialBrowserSessionAccount(sessionId)) ?? '')
  }, [sessionId])

  React.useEffect(() => {
    if (open) void refresh().catch((error: unknown) => setMessage(String(error)))
  }, [open, refresh])

  async function addAccount(): Promise<void> {
    if (!name.trim()) { setMessage('请填写账号名称'); return }
    setBusy(true)
    setMessage('')
    try {
      const now = new Date().toISOString()
      const id = crypto.randomUUID()
      const item: BrowserAccount = {
        id, profileId: id, platform, displayName: name.trim(),
        status: 'unverified',
        ...(legacyProject ? { legacyProfileKey: `workspace:${legacyProject}` } : {}),
        legacyProjectIds: legacyProject ? [legacyProject] : [],
        createdAt: now, updatedAt: now,
      }
      setAccounts(await window.electronAPI.saveSocialBrowserAccount(item))
      setName('')
      setLegacyProject('')
      setMessage('账号已添加。旧项目的登录数据不会移动或删除。')
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  async function importLegacyProjects(): Promise<void> {
    const candidates = workspaces.filter((project) =>
      /微信|视频号|知乎|小红书|哔哩|b站|bilibili/i.test(project.name) &&
      !accounts.some((account) => account.legacyProjectIds.includes(project.id))
    )
    if (candidates.length === 0) { setMessage('没有发现尚未登记的相关旧项目'); return }
    setBusy(true)
    setMessage('')
    try {
      let next = accounts
      for (const project of candidates) {
        const nameLower = project.name.toLowerCase()
        const detected: SocialPlatform = /微信|视频号/.test(project.name)
          ? 'wechat-channels'
          : /知乎/.test(project.name)
            ? 'zhihu'
            : /小红书/.test(project.name)
              ? 'xiaohongshu'
              : /哔哩|b站|bilibili/.test(nameLower) ? 'bilibili' : 'other'
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        next = await window.electronAPI.saveSocialBrowserAccount({
          id, profileId: id, displayName: project.name, platform: detected,
          legacyProfileKey: `workspace:${project.id}`,
          legacyProjectIds: [project.id], status: 'unverified', createdAt: now, updatedAt: now,
        })
      }
      setAccounts(next)
      setMessage(`已建立${candidates.length}个旧项目账号映射。登录状态没有被移动；请逐个核对对应的实际平台账号。`)
    } catch (error) {
      setMessage(`部分账号可能已登记，请刷新并检查：${String(error)}`)
      await refresh()
    } finally { setBusy(false) }
  }

  async function renameAccount(account: BrowserAccount): Promise<void> {
    const nextName = window.prompt('修改账号名称', account.displayName)
    if (nextName === null) return
    if (!nextName.trim()) { setMessage('账号名称不能为空'); return }
    setBusy(true)
    setMessage('')
    try {
      setAccounts(await window.electronAPI.saveSocialBrowserAccount({
        ...account, displayName: nextName.trim(), updatedAt: new Date().toISOString(),
      }))
      setMessage('账号名称已更新；浏览器登录身份没有变化。')
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  async function deleteAccount(account: BrowserAccount): Promise<void> {
    if (!window.confirm(`确定删除账号登记“${account.displayName}”？原项目和浏览器登录数据会保留；已绑定到会话的账号不可删除。`)) return
    setBusy(true)
    setMessage('')
    try {
      setAccounts(await window.electronAPI.deleteSocialBrowserAccount(account.id))
      setMessage('已删除账号登记。原项目及浏览器登录数据仍然保留。')
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  async function bindAccount(accountId: string): Promise<void> {
    if (!sessionId) { setMessage('请先选择一个 Agent 对话'); return }
    setBusy(true)
    setMessage('')
    try {
      await window.electronAPI.bindSocialBrowserSessionAccount(sessionId, accountId || null)
      setSelectedId(accountId)
      setMessage('已绑定。关闭当前浏览器后重新打开即可使用对应身份；账号过期时需重新登录。')
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  return (
    <>
      <button
        type="button"
        className="fixed bottom-5 left-5 z-[100] rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-lg hover:bg-muted"
        onClick={() => setOpen(true)}
        aria-label="打开多平台账号管理"
      >账号管理</button>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4">
          <section role="dialog" aria-modal="true" aria-label="多平台账号管理"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-5 text-foreground shadow-2xl">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">多平台账号管理</h2>
                <p className="text-xs text-muted-foreground">项目与账号独立管理，保留原项目及浏览器登录数据</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-3 py-1 text-sm">关闭</button>
            </header>
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="rounded-lg border bg-background p-2 text-sm" placeholder="账号名称（如视频号1）"
                value={name} onChange={(event) => setName(event.target.value)} />
              <select aria-label="平台" className="rounded-lg border bg-background p-2 text-sm" value={platform}
                onChange={(event) => setPlatform(event.target.value as SocialPlatform)}>
                {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <select aria-label="旧项目登录身份" className="rounded-lg border bg-background p-2 text-sm"
                value={legacyProject} onChange={(event) => setLegacyProject(event.target.value)}>
                <option value="">新身份（首次需登录）</option>
                {workspaces.map((w) => <option key={w.id} value={w.id}>继承旧项目：{w.name}</option>)}
              </select>
            </div>
            <p className="my-2 text-xs text-muted-foreground">迁移旧账号时选择原项目；新账号保持“新身份”。不要将同一个旧项目分配给多个不同账号。</p>
            <button type="button" disabled={busy} onClick={() => void addAccount()}
              className="mb-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">添加账号</button>
            <button type="button" disabled={busy} onClick={() => void importLegacyProjects()}
              className="mb-4 ml-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50">
              识别并导入旧项目
            </button>
            <div className="space-y-2">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{account.displayName}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {PLATFORMS.find((p) => p.value === account.platform)?.label ?? account.platform}
                      {account.legacyProjectIds.length > 0 ? ' · 继承旧项目登录' : ' · 独立新身份'}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <button type="button" disabled={busy || !sessionId}
                      onClick={() => void bindAccount(account.id)}
                      className="rounded-lg border px-3 py-1 disabled:opacity-50">
                      {selectedId === account.id ? '当前对话已选择' : '在当前对话使用'}
                    </button>
                    <button type="button" disabled={busy} onClick={() => void renameAccount(account)}
                      aria-label={`修改${account.displayName}名称`}
                      className="rounded-lg border px-2 py-1 disabled:opacity-50">改名</button>
                    <button type="button" disabled={busy} onClick={() => void deleteAccount(account)}
                      aria-label={`删除${account.displayName}账号登记`}
                      className="rounded-lg border px-2 py-1 text-destructive disabled:opacity-50">删除</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">当前对话：{sessionId || '未选择'} · 共{accounts.length}个账号</span>
              <button type="button" disabled={busy || !sessionId} onClick={() => void bindAccount('')}
                className="rounded-lg border px-3 py-1 text-xs">恢复项目默认身份</button>
            </div>
            {message && <p role="status" className="mt-3 rounded-lg bg-muted p-2 text-sm">{message}</p>}
          </section>
        </div>
      )}
    </>
  )
}
