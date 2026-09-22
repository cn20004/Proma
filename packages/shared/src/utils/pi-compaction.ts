/** Pi 默认自动压缩开始时的上下文占用比例（上游默认策略）。 */
export const PI_AUTO_COMPACTION_THRESHOLD_RATIO = 0.8

/** 20004 Edition 允许按会话覆盖压缩阈值。 */
export function normalizePiAutoCompactionThresholdRatio(
  ratio: number | undefined,
): number {
  if (typeof ratio !== 'number' || !Number.isFinite(ratio)) {
    return PI_AUTO_COMPACTION_THRESHOLD_RATIO
  }
  return Math.min(0.9, Math.max(0.1, ratio))
}

/**
 * 将目标上下文占用比例换算为 Pi SDK 的 reserveTokens 配置。
 *
 * Pi 在 contextTokens > contextWindow - reserveTokens 时自动压缩。
 * thresholdRatio=0.25 表示上下文约达到 25% 时开始压缩。
 */
export function calculatePiAutoCompactionReserveTokens(
  contextWindow: number,
  thresholdRatio?: number,
): number {
  if (!Number.isFinite(contextWindow) || contextWindow <= 0) {
    throw new TypeError('Pi context window must be a positive finite number')
  }

  const ratio = normalizePiAutoCompactionThresholdRatio(thresholdRatio)
  return Math.ceil(contextWindow * (1 - ratio))
}

/** 返回 Pi SDK 会开始自动压缩的上下文 token 阈值。 */
export function calculatePiAutoCompactionThresholdTokens(
  contextWindow: number,
  thresholdRatio?: number,
): number {
  return contextWindow - calculatePiAutoCompactionReserveTokens(contextWindow, thresholdRatio)
}
