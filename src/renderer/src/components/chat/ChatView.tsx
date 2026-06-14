import { useEffect, useRef } from 'react'
import type { Conversation } from '@shared/types'
import { actions, useStore } from '../../store'
import { formatTokens } from '@shared/context'
import { ConversationList } from './ConversationList'
import { Message } from './Message'
import { Composer } from './Composer'
import { ContextMeter } from './ContextMeter'
import { ModelPicker } from '../common/ModelPicker'
import { SparkIcon, CompassIcon, CompressIcon, AlertTriangleIcon } from '../../lib/icons'

function EmptyState() {
  const hasModel = useStore((s) => Boolean(s.engine.modelId))
  const modelCount = useStore((s) => s.installedModels.length)
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-oracle-accent to-oracle-accent-2 text-white shadow-2xl shadow-oracle-accent/30">
        <SparkIcon size={34} />
      </div>
      <h2 className="mb-2 text-2xl font-semibold text-oracle-text">Ask the Oracle</h2>
      <p className="mb-6 max-w-md text-[14px] leading-relaxed text-oracle-muted">
        {hasModel
          ? 'Your model is loaded and ready. Type a message below to begin a private, on-device conversation.'
          : modelCount > 0
            ? 'Select a model from the picker above to load it onto your GPU, then start chatting.'
            : 'You have no models yet. Head to Discover to download a chat model from Hugging Face.'}
      </p>
      {modelCount === 0 && (
        <button onClick={() => actions.setView('discover')} className="btn-primary">
          <CompassIcon size={16} /> Discover models
        </button>
      )}
    </div>
  )
}

/** Banner shown when the next reply may not fit the remaining context window. */
function OverflowBanner() {
  const usage = useStore((s) => s.contextUsage)
  const compacting = useStore((s) => s.compacting)
  const generating = useStore((s) => s.engine.state === 'generating')
  const autoCompact = useStore((s) => s.settings?.context.autoCompact ?? false)
  if (!usage || !usage.willOverflow) return null
  return (
    <div className="mx-auto mt-3 flex max-w-3xl items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-[12.5px] text-amber-200">
      <AlertTriangleIcon size={16} className="shrink-0 text-amber-400" />
      <span className="flex-1">
        The context window is nearly full. The next reply may be truncated.{' '}
        {autoCompact
          ? 'Older messages will be summarized automatically on your next send.'
          : 'Compact the conversation to free up space.'}
      </span>
      <button
        onClick={() => void actions.compact()}
        disabled={compacting || generating}
        className="btn-surface shrink-0 px-2.5 py-1 text-[12px] disabled:opacity-40"
      >
        <CompressIcon size={13} /> {compacting ? 'Compacting…' : 'Compact now'}
      </button>
    </div>
  )
}

/** Divider marking where older turns have been folded into a summary. */
function CompactionDivider({ conversation }: { conversation: Conversation }) {
  const c = conversation.compaction
  if (!c) return null
  return (
    <div
      className="my-1 flex items-center gap-2 text-[11.5px] text-oracle-muted/80"
      title={c.summary}
    >
      <div className="h-px flex-1 bg-oracle-border/60" />
      <CompressIcon size={12} />
      <span>
        {c.foldedCount} earlier {c.foldedCount === 1 ? 'message' : 'messages'} summarized
        {c.originalTokens > 0 && (
          <> · {formatTokens(c.originalTokens)} → {formatTokens(c.summaryTokens)} tokens</>
        )}
      </span>
      <div className="h-px flex-1 bg-oracle-border/60" />
    </div>
  )
}

export function ChatView() {
  const conversation = useStore((s) =>
    s.conversations.find((c) => c.id === s.activeConversationId)
  )
  const generating = useStore((s) => s.engine.state === 'generating')
  const scrollRef = useRef<HTMLDivElement>(null)
  const messages = conversation?.messages ?? []
  const lastLen = messages[messages.length - 1]?.content.length ?? 0

  // Keep the view pinned to the latest content while streaming.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages.length, lastLen])

  const visible = messages.filter((m) => m.role !== 'system')
  // Index (within `visible`) of the last message folded into the summary, if any.
  const through = conversation?.compaction?.throughMessageId
  const foldedThroughIdx = through ? visible.findIndex((m) => m.id === through) : -1

  return (
    <div className="flex min-h-0 flex-1">
      <ConversationList />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-oracle-border/60 px-4">
          <ModelPicker />
          <div className="flex min-w-0 items-center gap-4">
            <ContextMeter />
            {conversation && (
              <span className="hidden truncate text-[13px] font-medium text-oracle-muted sm:inline">
                {conversation.title}
              </span>
            )}
          </div>
        </div>

        {!conversation || visible.length === 0 ? (
          <EmptyState />
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <OverflowBanner />
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
              {visible.map((m, i) => (
                <div key={m.id} className="contents">
                  <div className={foldedThroughIdx >= 0 && i <= foldedThroughIdx ? 'opacity-45' : ''}>
                    <Message
                      message={m}
                      streaming={generating && i === visible.length - 1 && m.role === 'assistant'}
                    />
                  </div>
                  {i === foldedThroughIdx && conversation && (
                    <CompactionDivider conversation={conversation} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Composer />
      </div>
    </div>
  )
}
