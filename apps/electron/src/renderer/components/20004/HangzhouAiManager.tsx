import * as React from 'react'
import { AlertTriangle, BrainCircuit, Clock3, School, Search, Users } from 'lucide-react'
import type { HangzhouDailyBrief, HangzhouStudentPriority, HangzhouStudentRecord } from '../../../types/settings'

const LEVEL_LABEL: Record<HangzhouStudentPriority['level'], string> = { urgent: '紧急', high: '高', normal: '正常', low: '低' }

export function HangzhouAiManager(): React.ReactElement {
  const [brief, setBrief] = React.useState<HangzhouDailyBrief | null>(null)
  const [priorities, setPriorities] = React.useState<HangzhouStudentPriority[]>([])
  const [students, setStudents] = React.useState<HangzhouStudentRecord[]>([])

  const refresh = React.useCallback(async () => {
    const [nextBrief, nextPriorities, nextStudents] = await Promise.all([
      window.electronAPI.getHangzhouDailyBrief(),
      window.electronAPI.getHangzhouStudentPriorities(),
      window.electronAPI.listHangzhouStudents(),
    ])
    setBrief(nextBrief)
    setPriorities(nextPriorities)
    setStudents(nextStudents)
  }, [])

  React.useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const studentName = React.useCallback((id: string) => students.find((item) => item.id === id)?.name ?? id, [students])

  return (
    <section className="mt-6 rounded-xl border border-border/70 bg-card/70">
      <div className="border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2"><BrainCircuit size={18} /><h2 className="font-semibold">每日 AI 总管</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">每 60 秒从最新本地业务数据重新计算，不保存过期结论。</p>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 size={14}/>逾期跟进</div><div className="mt-2 text-2xl font-semibold">{brief?.overdueFollowUps ?? 0}</div></div>
        <div className="rounded-lg border p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Users size={14}/>高意向学生</div><div className="mt-2 text-2xl font-semibold">{brief?.highIntentStudents ?? 0}</div></div>
        <div className="rounded-lg border p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Search size={14}/>待验证情报</div><div className="mt-2 text-2xl font-semibold">{brief?.intelligenceToVerify ?? 0}</div></div>
        <div className="rounded-lg border p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><School size={14}/>推进中学校</div><div className="mt-2 text-2xl font-semibold">{brief?.schoolsInProgress ?? 0}</div></div>
      </div>

      {brief?.summary?.length ? <div className="mx-5 mb-5 rounded-lg bg-muted/25 p-4 text-sm"><div className="mb-2 font-medium">今天值得注意</div>{brief.summary.map((item) => <div key={item} className="mt-1 text-muted-foreground">• {item}</div>)}</div> : null}

      <div className="border-t border-border/60 px-5 py-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><AlertTriangle size={16}/>学生优先级</div>
        <div className="grid gap-2 lg:grid-cols-2">
          {priorities.slice(0, 8).map((item) => (
            <div key={item.studentId} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-3"><div className="font-medium">{studentName(item.studentId)}</div><div className="text-sm font-semibold tabular-nums">{item.score} · {LEVEL_LABEL[item.level]}</div></div>
              <div className="mt-1 text-xs text-muted-foreground">{item.reasons.join(' · ')}</div>
              <div className="mt-2 text-xs">下一步：{item.nextAction}</div>
            </div>
          ))}
          {priorities.length === 0 ? <div className="text-sm text-muted-foreground">暂无需要评分的未签约学生。</div> : null}
        </div>
      </div>
    </section>
  )
}