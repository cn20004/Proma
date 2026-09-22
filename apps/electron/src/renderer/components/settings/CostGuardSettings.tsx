import * as React from 'react'
import { ShieldCheck, Coins, Gauge, Wrench, Repeat2, BrainCircuit, Database, Route } from 'lucide-react'
import type { Channel } from '@proma/shared'
import { Button } from '@/components/ui/button'
import { SettingsCard, SettingsSection } from './primitives'

interface CostGuardForm {
  enabled: boolean
  maxBudgetUsd: number
  maxTurns: number
  maxToolCalls: number
  repeatToolCallLimit: number
  compactionPercent: number
  maxToolResultChars: number
  modelRouterEnabled: boolean
  cheapModelId: string
  strongModelId: string
}

const DEFAULT_FORM: CostGuardForm = {
  enabled: true,
  maxBudgetUsd: 0.5,
  maxTurns: 80,
  maxToolCalls: 100,
  repeatToolCallLimit: 5,
  compactionPercent: 25,
  maxToolResultChars: 60000,
  modelRouterEnabled: false,
  cheapModelId: '',
  strongModelId: '',
}

const PRESETS: Record<string, CostGuardForm> = {
  '极限省钱': {
    enabled: true,
    maxBudgetUsd: 0.2,
    maxTurns: 40,
    maxToolCalls: 50,
    repeatToolCallLimit: 4,
    compactionPercent: 18,
    maxToolResultChars: 40000,
    modelRouterEnabled: false,
    cheapModelId: '',
    strongModelId: '',
  },
  '均衡模式': DEFAULT_FORM,
  '深度研究': {
    enabled: true,
    maxBudgetUsd: 2,
    maxTurns: 180,
    maxToolCalls: 250,
    repeatToolCallLimit: 8,
    compactionPercent: 35,
    maxToolResultChars: 100000,
    modelRouterEnabled: false,
    cheapModelId: '',
    strongModelId: '',
  },
}

function NumberField(props: {
  label: string
  description: string
  icon: React.ReactNode
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}): React.ReactElement {
  return (
    <div className="flex items-center gap-4 border-b border-border/60 px-4 py-4 last:border-b-0">
      <div className="mt-0.5 text-muted-foreground">{props.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{props.label}</div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">{props.description}</div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={props.value}
          min={props.min}
          max={props.max}
          step={props.step ?? 1}
          onChange={(event) => props.onChange(Number(event.target.value))}
          className="h-9 w-24 rounded-md border border-border bg-background px-3 text-right text-sm outline-none focus:ring-1 focus:ring-ring"
        />
        {props.suffix && <span className="w-10 text-xs text-muted-foreground">{props.suffix}</span>}
      </div>
    </div>
  )
}

export function CostGuardSettings(): React.ReactElement {
  const [form, setForm] = React.useState<CostGuardForm>(DEFAULT_FORM)
  const [saved, setSaved] = React.useState(false)
  const [channels, setChannels] = React.useState<Channel[]>([])

  React.useEffect(() => {
    void window.electronAPI.listChannels().then(setChannels).catch(console.error)
    window.electronAPI.getSettings().then((settings) => {
      setForm({
        enabled: settings.costGuardEnabled ?? true,
        maxBudgetUsd: settings.agentMaxBudgetUsd ?? DEFAULT_FORM.maxBudgetUsd,
        maxTurns: settings.agentMaxTurns ?? DEFAULT_FORM.maxTurns,
        maxToolCalls: settings.agentMaxToolCalls ?? DEFAULT_FORM.maxToolCalls,
        repeatToolCallLimit: settings.agentRepeatToolCallLimit ?? DEFAULT_FORM.repeatToolCallLimit,
        compactionPercent: Math.round((settings.agentCompactionThresholdRatio ?? 0.25) * 100),
        maxToolResultChars: settings.agentMaxToolResultChars ?? DEFAULT_FORM.maxToolResultChars,
        modelRouterEnabled: settings.agentModelRouterEnabled ?? false,
        cheapModelId: settings.agentCheapModelId ?? '',
        strongModelId: settings.agentStrongModelId ?? '',
      })
    }).catch(console.error)
  }, [])

  const save = async (next: CostGuardForm = form): Promise<void> => {
    const normalized: CostGuardForm = {
      ...next,
      maxBudgetUsd: Math.max(0.01, next.maxBudgetUsd),
      maxTurns: Math.max(1, Math.round(next.maxTurns)),
      maxToolCalls: Math.max(1, Math.round(next.maxToolCalls)),
      repeatToolCallLimit: Math.max(2, Math.round(next.repeatToolCallLimit)),
      compactionPercent: Math.min(90, Math.max(10, Math.round(next.compactionPercent))),
      maxToolResultChars: Math.max(5000, Math.round(next.maxToolResultChars)),
    }
    setForm(normalized)
    await window.electronAPI.updateSettings({
      costGuardEnabled: normalized.enabled,
      agentMaxBudgetUsd: normalized.maxBudgetUsd,
      agentMaxTurns: normalized.maxTurns,
      agentMaxToolCalls: normalized.maxToolCalls,
      agentRepeatToolCallLimit: normalized.repeatToolCallLimit,
      agentCompactionThresholdRatio: normalized.compactionPercent / 100,
      agentMaxToolResultChars: normalized.maxToolResultChars,
      agentModelRouterEnabled: normalized.modelRouterEnabled,
      agentCheapModelId: normalized.cheapModelId || undefined,
      agentStrongModelId: normalized.strongModelId || undefined,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  const applyPreset = async (name: string): Promise<void> => {
    const next = PRESETS[name]
    if (!next) return
    await save({ ...next })
  }

  return (
    <div className="space-y-8">
      <SettingsSection
        title="20004 魔改版 · CostGuard"
        description="Proma 个性化增强版本。魔改人：20004。重点控制 Agent 成本、上下文膨胀和工具调用死循环。"
      >
        <SettingsCard>
          <div className="flex items-center gap-4 px-4 py-5">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><ShieldCheck size={22} /></div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">CostGuard 总开关</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                开启后，未单独配置时默认使用：$0.50 / 80 轮 / 100 次工具调用 / 5 次重复熔断 / 25% 上下文压缩。
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`h-7 w-12 rounded-full p-1 transition-colors ${form.enabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="一键预设" description="先选模式，再按任务需要微调。">
        <div className="flex flex-wrap gap-2">
          {Object.keys(PRESETS).map((name) => (
            <Button key={name} variant="outline" onClick={() => void applyPreset(name)}>{name}</Button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="核心限制" description="这些限制会真正进入 Pi Agent 运行时。">
        <SettingsCard>
          <NumberField
            label="单任务最大预算"
            description="超过预算后终止后续 prompt、工具调用和排队消息。"
            icon={<Coins size={18} />}
            value={form.maxBudgetUsd}
            min={0.01}
            max={100}
            step={0.05}
            suffix="USD"
            onChange={(value) => setForm((prev) => ({ ...prev, maxBudgetUsd: value }))}
          />
          <NumberField
            label="最大 Agent 轮次"
            description="防止一个任务无限自主运行。"
            icon={<Gauge size={18} />}
            value={form.maxTurns}
            min={1}
            max={1000}
            onChange={(value) => setForm((prev) => ({ ...prev, maxTurns: value }))}
          />
          <NumberField
            label="最大工具调用次数"
            description="针对高频 tool_calls；达到上限时由 20004 CostGuard 终止本次任务。"
            icon={<Wrench size={18} />}
            value={form.maxToolCalls}
            min={1}
            max={5000}
            onChange={(value) => setForm((prev) => ({ ...prev, maxToolCalls: value }))}
          />
          <NumberField
            label="重复工具熔断"
            description="相同工具 + 相同参数连续达到该次数时，判断为疑似死循环并停止。"
            icon={<Repeat2 size={18} />}
            value={form.repeatToolCallLimit}
            min={2}
            max={100}
            onChange={(value) => setForm((prev) => ({ ...prev, repeatToolCallLimit: value }))}
          />
          <NumberField
            label="工具结果最大回填"
            description="网页、Shell、搜索结果或文件读取过长时，保留前后关键信息并裁剪中间内容，避免一次工具输出撑爆上下文。"
            icon={<Database size={18} />}
            value={form.maxToolResultChars}
            min={5000}
            max={500000}
            step={5000}
            suffix="字符"
            onChange={(value) => setForm((prev) => ({ ...prev, maxToolResultChars: value }))}
          />
          <NumberField
            label="上下文自动压缩阈值"
            description="DeepSeek Flash 1M 上下文时，25% 约等于 25 万 token 开始压缩。"
            icon={<BrainCircuit size={18} />}
            value={form.compactionPercent}
            min={10}
            max={90}
            suffix="%"
            onChange={(value) => setForm((prev) => ({ ...prev, compactionPercent: value }))}
          />
        </SettingsCard>
      </SettingsSection>


      <SettingsSection
        title="20004 Model Router"
        description="同一渠道内自动分流：简单任务优先便宜模型，复杂研究/代码任务优先强模型。若当前渠道没有所选模型，会自动回退到你手动选择的模型。"
      >
        <SettingsCard>
          <div className="flex items-center gap-4 border-b border-border/60 px-4 py-4">
            <div className="text-muted-foreground"><Route size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">自动模型分流</div>
              <div className="mt-1 text-xs text-muted-foreground">仅在当前渠道内切换，不跨渠道改 API Key。</div>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, modelRouterEnabled: !prev.modelRouterEnabled }))}
              className={`h-7 w-12 rounded-full p-1 transition-colors ${form.modelRouterEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${form.modelRouterEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          {([
            ['简单任务模型', 'cheapModelId'],
            ['复杂任务模型', 'strongModelId'],
          ] as const).map(([label, key]) => (
            <div key={key} className="flex items-center gap-4 border-b border-border/60 px-4 py-4 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{label}</div>
                <div className="mt-1 text-xs text-muted-foreground">按模型 ID 匹配当前渠道；留空表示不自动切换这一档。</div>
              </div>
              <select
                value={form[key]}
                onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                className="h-9 max-w-[360px] rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">不自动切换</option>
                {channels.flatMap((channel) =>
                  channel.models.filter((model) => model.enabled !== false).map((model) => (
                    <option key={`${channel.id}:${model.id}`} value={model.id}>
                      {channel.name} · {model.name || model.id}
                    </option>
                  )),
                )}
              </select>
            </div>
          ))}
        </SettingsCard>
      </SettingsSection>

      <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
        <div className="text-xs text-muted-foreground">
          20004 Edition · CostGuard V1 · 所有设置保存在本机 Proma 配置中。
        </div>
        <Button onClick={() => void save()}>{saved ? '已保存' : '保存设置'}</Button>
      </div>
    </div>
  )
}
