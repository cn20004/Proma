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
                  <button type="button" disabled={busy || !sessionId}
                    onClick={() => void bindAccount(account.id)}
                    className="shrink-0 rounded-lg border px-3 py-1 disabled:opacity-50">
                    {selectedId === account.id ? '当前对话已选择' : '在当前对话使用'}
                  </button>
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
