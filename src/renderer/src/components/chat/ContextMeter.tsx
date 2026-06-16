import { actions, useStore } from '../../store'
import { contextPercent, formatTokens, levelColor } from '@shared/context'
import { CompressIcon, LayersIcon } from '../../lib/icons'

/**
 * Compact header widget: a fill bar showing how much of the context window the
 * active conversation occupies, plus a one-click "compact" action. Colour and
 * tooltip escalate as the window fills.
 */
export function ContextMeter() {
  const usage = useStore((s) => s.contextUsage)
  const compacting = useStore((s) => s.compacting)
  const generating = useStore((s) => s.engine.state === 'generating')
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
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-sibyl-surface-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <span className={`font-mono text-[11px] tabular-nums ${text}`}>
        {formatTokens(usage.usedTokens)}/{formatTokens(usage.contextSize)}
      </span>
      <button
        onClick={() => void actions.compact()}
        disabled={compacting || generating}
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-sibyl-muted transition-colors hover:bg-sibyl-surface-2 hover:text-sibyl-text disabled:opacity-40"
        title="Summarize older messages to free up context"
      >
        <CompressIcon size={13} />
        {compacting ? 'Compacting…' : 'Compact'}
      </button>
    </div>
  )
}
