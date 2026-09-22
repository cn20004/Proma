import * as React from 'react'
import { Users, Network, Clapperboard, Search, Flame, Clock3, Database } from 'lucide-react'
import type { HangzhouProjectDashboard as DashboardData } from '../../../types/settings'
import { HangzhouStudentCRM } from './HangzhouStudentCRM'
import { HangzhouChannelPanel, HangzhouContentPanel, HangzhouIntelligencePanel } from './HangzhouBusinessPanels'
import { HangzhouAiManager } from './HangzhouAiManager'

function StatCard(props: { title: string; value: number; icon: React.ReactNode; hint: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{props.title}</span>
        <span className="text-muted-foreground">{props.icon}</span>
      </div>
      <div className="text-3xl font-semibold tabular-nums">{props.value}</div>
      <div className="mt-2 text-xs text-muted-foreground">{props.hint}</div>
    </div>
  )
}

export function HangzhouProjectDashboard(): React.ReactElement {
  const [data, setData] = React.useState<DashboardData | null>(null)

  const refresh = React.useCallback(() => {
    void window.electronAPI.getHangzhouProjectDashboard().then(setData).catch(console.error)
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="h-full overflow-y-auto bg-content-area">
      <div className="mx-auto max-w-[1180px] px-6 py-8">
        <div className="mb-7">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Proma · 20004 Edition</div>
          <h1 className="mt-2 text-2xl font-semibold">杭州项目驾驶舱</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            学生 CRM、渠道关系、内容作战、同行情报统一入口。数据仅保存在本机 ~/.proma。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="学生档案" value={data?.students ?? 0} icon={<Users size={18} />} hint="咨询 → 到校 → 试听 → 签约" />
          <StatCard title="渠道档案" value={data?.channels ?? 0} icon={<Network size={18} />} hint="个人 / 团队 / 公司 / 介绍关系" />
          <StatCard title="内容资产" value={data?.contentItems ?? 0} icon={<Clapperboard size={18} />} hint="选题 / 标题 / 脚本 / 已发布" />
          <StatCard title="情报证据" value={data?.intelligenceItems ?? 0} icon={<Search size={18} />} hint="人物 / 公司 / 账号 / 证据链" />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card/70 p-5 lg:col-span-2">
            <h2 className="text-base font-semibold">今天优先处理</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium"><Flame size={16} />高意向学生</div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">{data?.highIntentStudents ?? 0}</div>
                <div className="mt-1 text-xs text-muted-foreground">后续会接入学生优先级评分与下一步沟通建议。</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium"><Clock3 size={16} />待跟进</div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">{data?.pendingFollowUps ?? 0}</div>
                <div className="mt-1 text-xs text-muted-foreground">超过计划跟进时间的学生会自动进入这里。</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/70 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><Database size={16} />本地数据</div>
            <div className="mt-3 break-all text-xs leading-5 text-muted-foreground">
              {data?.dataPath ?? '正在初始化杭州项目数据…'}
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              最后更新：{data ? new Date(data.updatedAt).toLocaleString() : '—'}
            </div>
          </div>
        </div>

        <HangzhouAiManager />

        <HangzhouStudentCRM onChanged={refresh} />

        <div className="mt-6 grid gap-5">
          <HangzhouChannelPanel onChanged={refresh} />
          <HangzhouContentPanel onChanged={refresh} />
          <HangzhouIntelligencePanel onChanged={refresh} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ['学生 CRM', '学生基本信息、来源、意向方向、家庭决策角色、异议、沟通记录、下一次跟进。'],
            ['渠道关系', '代理、介绍人、公司、团队、报名、到校、签约和关系图谱。'],
            ['内容作战室', '视频号/抖音/小红书的选题、标题、脚本、拍摄和复盘。'],
            ['情报中心', '人物、公司、账号、手机号、证据、时间线和可信度分级。'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-xl border border-border/70 bg-card/70 p-5">
              <div className="font-semibold">{title}</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</div>
              <div className="mt-3 text-xs font-medium text-primary">20004 Edition · 持续开发中</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
