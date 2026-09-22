/** Pi 自动压缩开始时的上下文占用比例。 */
export const PI_AUTO_COMPACTION_THRESHOLD_RATIO = 0.25

/**
 * 将目标上下文占用比例换算为 Pi SDK 的 reserveTokens 配置。
 *
 * Pi 在 `contextTokens > contextWindow - reserveTokens` 时自动压缩，
 * 因此预留 75% 的窗口，在约 25% 占用时提前压缩，降低长 Agent 会话的重复上下文成本。
 */
export function calculatePiAutoCompactionReserveTokens(contextWindow: number): number {
  if (!Number.isFinite(contextWindow) || contextWindow <= 0) {
    throw new TypeError('Pi context window must be a positive finite number')
  }

  return Math.ceil(contextWindow * (1 - PI_AUTO_COMPACTION_THRESHOLD_RATIO))
}

/** 返回 Pi SDK 会开始自动压缩的上下文 token 阈值。 */
export function calculatePiAutoCompactionThresholdTokens(contextWindow: number): number {
  return contextWindow - calculatePiAutoCompactionReserveTokens(contextWindow)
}
