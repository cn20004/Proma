import * as React from 'react'
import { useAtomValue } from 'jotai'
import { Activity, Coins, Database, Gauge, Repeat2, Wrench } from 'lucide-react'
import {
  agentLiveMessagesAtomFamily,
  agentSessionStreamingStateAtomFamily,
} from '@/atoms/agent-atoms'

interface CostDashboardLimits {
  maxBudgetUsd: number
  maxTurns: number
  maxToolCalls: number
}

const DEFAULT_LIMITS: CostDashboardLimits = {
  maxBudgetUsd: 0.5,
  maxTurns: 80,
  maxToolCalls: 100,
}

function formatTokens(value: number | undefined): string {
  if (value == null) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`
  return String(Math.round(value))
}

function Metric(props: {
  icon: React.ReactNode
  label: string
  value: string
  warning?: boolean
}): React.ReactElement {
  return (
    <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
      <span className={props.warning ? 'text-amber-500' : 'text-muted-foreground'}>{props.icon}</span>
      <span className="text-[11px] text-muted-foreground">{props.label}</span>
      <span className={`text-[11px] font-medium tabular-nums ${props.warning ? 'text-amber-500' : 'text-foreground/85'}`}>
        {props.value}
      </span>
    </div>
  )
}

/**
 * 20004 Edition 实时成本仪表盘。
 *
 * 仅消费已有流式状态和 SDK 消息，不额外发起任何模型/API 请求。
 */
export function CostDashboard({ sessionId }: { sessionId: string }): React.ReactElement {
  const stream = useAtomValue(agentSessionStreamingStateAtomFamily(sessionId))
  const liveMessages = useAtomValue(agentLiveMessagesAtomFamily(sessionId))
  const [limits, setLimits] = React.useState<CostDashboardLimits>(DEFAULT_LIMITS)

  React.useEffect(() => {
    window.electronAPI.getSettings().then((settings) => {
      setLimits({
        maxBudgetUsd: settings.agentMaxBudgetUsd ?? DEFAULT_LIMITS.maxBudgetUsd,
        maxTurns: settings.agentMaxTurns ?? DEFAULT_LIMITS.maxTurns,
        maxToolCalls: settings.agentMaxToolCalls ?? DEFAULT_LIMITS.maxToolCalls,
      })
    }).catch(() => {})
  }, [])

  const assistantMessages = React.useMemo(
    () => liveMessages.filter((message) => message.type === 'assistant'),
    [liveMessages],
  )

  const toolCalls = React.useMemo(() => {
    let count = 0
    for (const message of assistantMessages) {
      const content = (message as { message?: { content?: Array<{ type?: string }> } }).message?.content
      if (!Array.isArray(content)) continue
      count += content.filter((block) => block?.type === 'tool_use').length
    }
    return count
  }, [assistantMessages])

  const turns = assistantMessages.length
  const requests = assistantMessages.length
  const contextTokens = stream?.inputTokens
  const contextWindow = stream?.contextWindow
  const costUsd = stream?.costUsd ?? 0
  const cacheRead = stream?.cacheReadTokens ?? 0
  const cacheRate = contextTokens && contextTokens > 0
    ? Math.min(100, Math.max(0, cacheRead / contextTokens * 100))
    : undefined
  const elapsedMinutes = stream?.startedAt
    ? Math.max((Date.now() - stream.startedAt) / 60_000, 1 / 60)
    : undefined
  const burnRate = elapsedMinutes ? costUsd / elapsedMinutes : undefined

  const costWarning = costUsd >= limits.maxBudgetUsd * 0.8
  const toolWarning = toolCalls >= limits.maxToolCalls * 0.8
  const turnWarning = turns >= limits.maxTurns * 0.8

  return (
    <div className="mx-2.5 mt-1 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 md:mx-[18px]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="mr-1 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
          <Gauge className="size-3.5" />
          20004 Cost Dashboard
        </div>
        <Metric icon={<Coins className="size-3.5" />} label="本任务" value={`$${costUsd.toFixed(4)} / $${limits.maxBudgetUsd.toFixed(2)}`} warning={costWarning} />
        <Metric icon={<Activity className="size-3.5" />} label="请求" value={String(requests)} />
        <Metric icon={<Wrench className="size-3.5" />} label="Tool" value={`${toolCalls} / ${limits.maxToolCalls}`} warning={toolWarning} />
        <Metric icon={<Repeat2 className="size-3.5" />} label="Turns" value={`${turns} / ${limits.maxTurns}`} warning={turnWarning} />
        <Metric icon={<Database className="size-3.5" />} label="Context" value={`${formatTokens(contextTokens)} / ${formatTokens(contextWindow)}`} />
        <Metric icon={<Database className="size-3.5" />} label="Cache" value={cacheRate == null ? '—' : `${cacheRate.toFixed(1)}%`} />
        <Metric icon={<Activity className="size-3.5" />} label="消耗速度" value={burnRate == null ? '—' : `$${burnRate.toFixed(3)}/min`} />
      </div>
    </div>
  )
}
