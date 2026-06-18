import { useStore } from '../../store'
import { contextPercent, formatTokens, levelColor } from '@shared/context'
import { LayersIcon } from '../../lib/icons'

/**
 * Compact, display-only header widget: a fill bar showing how much of the context
 * window the active conversation occupies. Colour + tooltip escalate as it fills.
 * The manual "compact" action lives in the header overflow menu (and the overflow
 * banner) so this stays a glanceable readout.
 */
export function ContextMeter() {
  const usage = useStore((s) => s.contextUsage)
  const hasModel = useStore((s) => Boolean(s.engine.modelId))

  if (!hasModel || !usage || usage.contextSize <= 0) return null

  const pct = contextPercent(usage.fraction)
  const { text, bar } = levelColor(usage.level)
  const tip =
    `${usage.usedTokens.toLocaleString()} / ${usage.contextSize.toLocaleString()} tokens` +
    ` (${pct}%${usage.exact ? '' : ', estimated'})\n` +
    `${usage.responseReserveTokens.toLocaleString()} reserved for the reply` +
    (usage.willOverflow ? '\n⚠ The next reply may not fit — compact to free space.' : '')

  return (
    <div className="no-drag flex items-center gap-2" title={tip}>
      <LayersIcon size={13} className={text} />
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-sibyl-surface-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <span className={`font-mono text-[11px] tabular-nums ${text}`}>
        {formatTokens(usage.usedTokens)}/{formatTokens(usage.contextSize)}
      </span>
    </div>
  )
}
