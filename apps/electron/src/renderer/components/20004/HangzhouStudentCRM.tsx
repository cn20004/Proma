import * as React from 'react'
import { Plus, Trash2, UserRoundPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { HangzhouStudentInput, HangzhouStudentRecord } from '../../../types/settings'

const EMPTY_FORM: HangzhouStudentInput = {
  name: '',
  education: '',
  graduation: '',
  source: '',
  direction: '',
  stage: 'lead',
  intent: 'medium',
  concern: '',
  notes: '',
}

const STAGE_LABELS: Record<HangzhouStudentRecord['stage'], string> = {
  lead: '咨询',
  appointment: '预约',
  arrived: '到校',
  trial: '试听',
  signed: '签约',
}

const INTENT_LABELS: Record<HangzhouStudentRecord['intent'], string> = {
  low: '低',
  medium: '中',
  high: '高',
}

function toDateTimeLocal(value?: number): string {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function HangzhouStudentCRM({ onChanged }: { onChanged?: () => void }): React.ReactElement {
  const [students, setStudents] = React.useState<HangzhouStudentRecord[]>([])
  const [form, setForm] = React.useState<HangzhouStudentInput>(EMPTY_FORM)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const refresh = React.useCallback(async (): Promise<void> => {
    setStudents(await window.electronAPI.listHangzhouStudents())
  }, [])

  React.useEffect(() => { void refresh() }, [refresh])

  const submit = async (): Promise<void> => {
    const name = form.name.trim()
    if (!name) return
    setSaving(true)
    try {
      const input = { ...form, name }
      if (editingId) await window.electronAPI.updateHangzhouStudent(editingId, input)
      else await window.electronAPI.createHangzhouStudent(input)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await refresh()
      onChanged?.()
    } finally {
      setSaving(false)
    }
  }

  const edit = (student: HangzhouStudentRecord): void => {
    setEditingId(student.id)
    setForm({
      name: student.name,
      education: student.education ?? '',
      graduation: student.graduation ?? '',
      source: student.source ?? '',
      direction: student.direction ?? '',
      stage: student.stage,
      intent: student.intent,
      concern: student.concern ?? '',
      nextFollowUpAt: student.nextFollowUpAt,
      notes: student.notes ?? '',
    })
  }

  return (
    <section className="mt-6 rounded-xl border border-border/70 bg-card/70">
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="font-semibold">学生 CRM</h2>
        <p className="mt-1 text-xs text-muted-foreground">学生来源、阶段、意向、顾虑和下一次跟进统一记录。</p>
      </div>

      <div className="grid gap-3 border-b border-border/60 p-5 md:grid-cols-2 xl:grid-cols-4">
        <input className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="姓名 *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <input className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="学历 / 专业" value={form.education ?? ''} onChange={(e) => setForm((p) => ({ ...p, education: e.target.value }))} />
        <input className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="届别，如 2026届" value={form.graduation ?? ''} onChange={(e) => setForm((p) => ({ ...p, graduation: e.target.value }))} />
        <input className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="来源渠道" value={form.source ?? ''} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} />
        <input className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="意向方向" value={form.direction ?? ''} onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value }))} />
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.stage} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value as HangzhouStudentInput['stage'] }))}>
          {Object.entries(STAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.intent} onChange={(e) => setForm((p) => ({ ...p, intent: e.target.value as HangzhouStudentInput['intent'] }))}>
          {Object.entries(INTENT_LABELS).map(([value, label]) => <option key={value} value={value}>意向：{label}</option>)}
        </select>
        <input type="datetime-local" className="h-9 rounded-md border bg-background px-3 text-sm" value={toDateTimeLocal(form.nextFollowUpAt)} onChange={(e) => setForm((p) => ({ ...p, nextFollowUpAt: e.target.value ? new Date(e.target.value).getTime() : undefined }))} />
        <input className="h-9 rounded-md border bg-background px-3 text-sm md:col-span-2" placeholder="核心顾虑，例如：就业真实性 / 费用 / 家长反对" value={form.concern ?? ''} onChange={(e) => setForm((p) => ({ ...p, concern: e.target.value }))} />
        <input className="h-9 rounded-md border bg-background px-3 text-sm md:col-span-2" placeholder="备注" value={form.notes ?? ''} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        <div className="flex gap-2 md:col-span-2 xl:col-span-4">
          <Button disabled={saving || !form.name.trim()} onClick={() => void submit()}>
            <Plus size={15} className="mr-2" />{editingId ? '保存修改' : '新增学生'}
          </Button>
          {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm(EMPTY_FORM) }}>取消编辑</Button>}
        </div>
      </div>

      <div className="overflow-x-auto">
        {students.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">还没有学生档案。上面新增第一条即可。</div>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">学生</th><th className="px-4 py-3">来源</th><th className="px-4 py-3">方向</th><th className="px-4 py-3">阶段</th><th className="px-4 py-3">意向</th><th className="px-4 py-3">核心顾虑</th><th className="px-4 py-3">下次跟进</th><th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3"><div className="font-medium">{student.name}</div><div className="text-xs text-muted-foreground">{[student.education, student.graduation].filter(Boolean).join(' · ') || '—'}</div></td>
                  <td className="px-4 py-3">{student.source || '—'}</td>
                  <td className="px-4 py-3">{student.direction || '—'}</td>
                  <td className="px-4 py-3">{STAGE_LABELS[student.stage]}</td>
                  <td className="px-4 py-3">{INTENT_LABELS[student.intent]}</td>
                  <td className="max-w-[240px] truncate px-4 py-3">{student.concern || '—'}</td>
                  <td className="px-4 py-3">{student.nextFollowUpAt ? new Date(student.nextFollowUpAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => edit(student)}><UserRoundPen size={14} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (!window.confirm(`确认删除学生「${student.name}」？`)) return
                      void window.electronAPI.deleteHangzhouStudent(student.id).then(async () => { await refresh(); onChanged?.() })
                    }}><Trash2 size={14} /></Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
