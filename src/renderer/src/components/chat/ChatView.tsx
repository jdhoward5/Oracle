import { useEffect, useRef } from 'react'
import { actions, useStore } from '../../store'
import { ConversationList } from './ConversationList'
import { Message } from './Message'
import { Composer } from './Composer'
import { ModelPicker } from '../common/ModelPicker'
import { SparkIcon, CompassIcon } from '../../lib/icons'

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

  return (
    <div className="flex min-h-0 flex-1">
      <ConversationList />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-oracle-border/60 px-4">
          <ModelPicker />
          {conversation && (
            <span className="truncate text-[13px] font-medium text-oracle-muted">{conversation.title}</span>
          )}
        </div>

        {!conversation || visible.length === 0 ? (
          <EmptyState />
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
              {visible.map((m, i) => (
                <Message
                  key={m.id}
                  message={m}
                  streaming={generating && i === visible.length - 1 && m.role === 'assistant'}
                />
              ))}
            </div>
          </div>
        )}

        <Composer />
      </div>
    </div>
  )
}
