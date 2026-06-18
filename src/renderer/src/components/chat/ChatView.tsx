import { useEffect, useRef, useState } from 'react'
import type { Conversation, Persona } from '@shared/types'
import { actions, useStore } from '../../store'
import { formatTokens } from '@shared/context'
import { findPersona } from '@shared/personas'
import { ConversationList } from './ConversationList'
import { Message } from './Message'
import { Composer } from './Composer'
import { ContextMeter } from './ContextMeter'
import { ConversationSettingsDrawer } from './ConversationSettingsDrawer'
import { ModelPicker } from '../common/ModelPicker'
import { Avatar } from '../persona/Avatar'
import { PersonaPicker } from '../persona/PersonaPicker'
import { PersonaEditor } from '../persona/PersonaEditor'
import {
  CompressIcon,
  AlertTriangleIcon,
  SearchIcon,
  SlidersIcon,
  EditIcon,
  ChevronRight,
  MoreVerticalIcon,
  XIcon
} from '../../lib/icons'

/** Banner shown when the next reply may not fit the remaining context window. */
function OverflowBanner() {
  const usage = useStore((s) => s.contextUsage)
  const compacting = useStore((s) => s.compacting)
  const generating = useStore((s) => s.engine.state === 'generating')
  const autoCompact = useStore((s) => s.settings?.context.autoCompact ?? false)
  if (!usage || !usage.willOverflow) return null
  return (
    <div className="mx-auto mt-3 flex max-w-[680px] items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-[12.5px] text-amber-200">
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
    <div className="my-1 flex items-center gap-2 text-[11.5px] text-sibyl-muted/80" title={c.summary}>
      <div className="h-px flex-1 bg-sibyl-border/60" />
      <CompressIcon size={12} />
      <span>
        {c.foldedCount} earlier {c.foldedCount === 1 ? 'message' : 'messages'} summarized
        {c.originalTokens > 0 && (
          <> · {formatTokens(c.originalTokens)} → {formatTokens(c.summaryTokens)} tokens</>
        )}
      </span>
      <div className="h-px flex-1 bg-sibyl-border/60" />
    </div>
  )
}

/** A hairline scene caption above the first beat (uses the persona's role). */
function SceneDivider({ caption }: { caption: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-px flex-1 bg-sibyl-border/70" />
      <span className="eyebrow text-[10.5px] tracking-[0.1em] text-sibyl-faint">scene · {caption}</span>
      <div className="h-px flex-1 bg-sibyl-border/70" />
    </div>
  )
}

/** Overflow menu collapsing find / compact / thread-settings into one control. */
function HeaderMenu({
  hasOverrides,
  onFind,
  onThreadSettings
}: {
  hasOverrides: boolean
  onFind: () => void
  onThreadSettings: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const compacting = useStore((s) => s.compacting)
  const generating = useStore((s) => s.engine.state === 'generating')
  const canCompact = useStore((s) => Boolean(s.engine.modelId) && (s.contextUsage?.contextSize ?? 0) > 0)

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const item = 'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-sibyl-secondary transition-colors hover:bg-sibyl-surface-2 hover:text-sibyl-text disabled:opacity-40'

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost relative h-8 w-8 p-0" title="More">
        <MoreVerticalIcon size={16} />
        {hasOverrides && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sibyl-accent" />}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-30 w-56 animate-fade-in rounded-lg border border-sibyl-border bg-sibyl-surface p-1 shadow-2xl">
          <button
            className={item}
            onClick={() => {
              setOpen(false)
              onFind()
            }}
          >
            <SearchIcon size={15} className="text-sibyl-muted" />
            <span className="flex-1">Find in conversation</span>
            <span className="font-mono text-[10.5px] text-sibyl-faint">Ctrl+F</span>
          </button>
          {canCompact && (
            <button
              className={item}
              disabled={compacting || generating}
              onClick={() => {
                setOpen(false)
                void actions.compact()
              }}
            >
              <CompressIcon size={15} className="text-sibyl-muted" />
              {compacting ? 'Compacting…' : 'Compact context'}
            </button>
          )}
          <button
            className={item}
            onClick={() => {
              setOpen(false)
              onThreadSettings()
            }}
          >
            <SlidersIcon size={15} className={hasOverrides ? 'text-sibyl-accent' : 'text-sibyl-muted'} />
            Thread settings & export
          </button>
        </div>
      )}
    </div>
  )
}

/** The persona header strip at the top of the chat column. */
function PersonaStrip({
  conversation,
  persona,
  onEditPersona,
  onFind,
  onThreadSettings
}: {
  conversation: Conversation
  persona: Persona | null
  onEditPersona: () => void
  onFind: () => void
  onThreadSettings: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-sibyl-border/60 px-3.5 py-3">
      {/* The persona block itself is the edit affordance — no separate button. */}
      <button
        onClick={onEditPersona}
        title={persona ? 'Edit persona' : 'Add a persona'}
        className="no-drag group -mx-1.5 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-sibyl-surface"
      >
        {persona ? (
          <Avatar avatar={persona.avatar} size={40} />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sibyl-border text-[15px] text-sibyl-accent">
            ◆
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-[15px] font-bold tracking-tight text-sibyl-text">
              {persona ? persona.name : conversation.title}
            </span>
            {persona && (
              <span className="shrink-0 rounded-full border border-sibyl-accent-2/30 px-2 py-px font-mono text-[11px] text-sibyl-accent-2">
                persona
              </span>
            )}
            <EditIcon size={12} className="shrink-0 text-sibyl-muted opacity-0 transition-opacity group-hover:opacity-70" />
          </div>
          <div className="truncate text-[12.5px] text-sibyl-muted">
            {persona
              ? [persona.role, ...persona.voiceTags].filter(Boolean).join(' · ') || 'Persona'
              : 'No persona · click to add'}
          </div>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2.5">
        <ModelPicker />
        <ContextMeter />
        <HeaderMenu hasOverrides={Boolean(conversation.overrides)} onFind={onFind} onThreadSettings={onThreadSettings} />
      </div>
    </div>
  )
}

export function ChatView() {
  const conversation = useStore((s) => s.conversations.find((c) => c.id === s.activeConversationId))
  const personas = useStore((s) => s.settings?.personas ?? [])
  const pickerOpen = useStore((s) => s.personaPickerOpen)
  const hasConversations = useStore((s) => s.conversations.length > 0)
  const generating = useStore((s) => s.engine.state === 'generating')
  const scrollRef = useRef<HTMLDivElement>(null)
  const findInputRef = useRef<HTMLInputElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [findIdx, setFindIdx] = useState(0)
  const messages = conversation?.messages ?? []
  const lastLen = messages[messages.length - 1]?.content.length ?? 0

  const persona = findPersona(personas, conversation?.personaId)
  const speaker = persona ? persona.name.split(/\s+/)[0] : 'Sibyl'

  // The picker takes over the column when explicitly opened, or when there's no
  // active thread to show.
  const showPicker = pickerOpen || !conversation

  // Keep the view pinned to the latest content while streaming.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages.length, lastLen])

  const visible = messages.filter((m) => m.role !== 'system')
  const through = conversation?.compaction?.throughMessageId
  const foldedThroughIdx = through ? visible.findIndex((m) => m.id === through) : -1

  const fq = findQuery.trim().toLowerCase()
  const matchIds = fq ? visible.filter((m) => m.content.toLowerCase().includes(fq)).map((m) => m.id) : []
  const safeIdx = matchIds.length ? Math.min(findIdx, matchIds.length - 1) : 0
  const currentMatchId = matchIds[safeIdx] ?? null

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        setFindOpen(true)
        setTimeout(() => findInputRef.current?.focus(), 0)
      } else if (e.key === 'Escape' && findOpen) {
        setFindOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [findOpen])

  useEffect(() => {
    if (!findOpen || !currentMatchId) return
    document.getElementById(`msg-${currentMatchId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [findOpen, currentMatchId])

  const stepMatch = (dir: number): void => {
    if (!matchIds.length) return
    setFindIdx((i) => (Math.min(i, matchIds.length - 1) + dir + matchIds.length) % matchIds.length)
  }

  return (
    <div className="flex min-h-0 flex-1">
      <ConversationList />
      <div className="flex min-w-0 flex-1 flex-col">
        {showPicker ? (
          <PersonaPicker canCancel={hasConversations} />
        ) : (
          <>
            <PersonaStrip
              conversation={conversation!}
              persona={persona}
              onEditPersona={() => setPersonaEditorOpen(true)}
              onFind={() => {
                setFindOpen(true)
                setTimeout(() => findInputRef.current?.focus(), 0)
              }}
              onThreadSettings={() => setSettingsOpen(true)}
            />

            {findOpen && (
              <div className="flex shrink-0 items-center gap-2 border-b border-sibyl-border/60 bg-sibyl-surface/40 px-4 py-2">
                <SearchIcon size={14} className="shrink-0 text-sibyl-muted" />
                <input
                  ref={findInputRef}
                  value={findQuery}
                  onChange={(e) => {
                    setFindQuery(e.target.value)
                    setFindIdx(0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      stepMatch(e.shiftKey ? -1 : 1)
                    } else if (e.key === 'Escape') {
                      setFindOpen(false)
                    }
                  }}
                  placeholder="Find in conversation…"
                  className="input h-7 flex-1 text-[12.5px]"
                />
                <span className="shrink-0 font-mono text-[11.5px] text-sibyl-muted">
                  {matchIds.length ? `${safeIdx + 1}/${matchIds.length}` : '0/0'}
                </span>
                <button onClick={() => stepMatch(-1)} disabled={!matchIds.length} className="btn-ghost h-7 w-7 p-0 disabled:opacity-40" title="Previous match (Shift+Enter)">
                  <ChevronRight size={15} className="-rotate-90" />
                </button>
                <button onClick={() => stepMatch(1)} disabled={!matchIds.length} className="btn-ghost h-7 w-7 p-0 disabled:opacity-40" title="Next match (Enter)">
                  <ChevronRight size={15} className="rotate-90" />
                </button>
                <button onClick={() => setFindOpen(false)} className="btn-ghost h-7 w-7 p-0" title="Close">
                  <XIcon size={15} />
                </button>
              </div>
            )}

            {visible.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="max-w-md text-[14px] leading-relaxed text-sibyl-muted">
                  {persona
                    ? `Write the first beat with ${persona.name} below.`
                    : 'Type a message below to begin a private, on-device conversation.'}
                </p>
              </div>
            ) : (
              <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <OverflowBanner />
                <div className="mx-auto flex max-w-[680px] flex-col gap-[26px] px-7 py-7">
                  {persona && persona.role && <SceneDivider caption={persona.role} />}
                  {visible.map((m, i) => (
                    <div key={m.id} className="contents">
                      <div id={`msg-${m.id}`} className={foldedThroughIdx >= 0 && i <= foldedThroughIdx ? 'opacity-45' : ''}>
                        <Message
                          message={m}
                          streaming={generating && i === visible.length - 1 && m.role === 'assistant'}
                          isLast={i === visible.length - 1}
                          highlighted={m.id === currentMatchId}
                          speaker={speaker}
                        />
                      </div>
                      {i === foldedThroughIdx && <CompactionDivider conversation={conversation!} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Composer />
          </>
        )}
      </div>

      {settingsOpen && conversation && (
        <ConversationSettingsDrawer
          key={conversation.id}
          conversation={conversation}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {personaEditorOpen && conversation && (
        <PersonaEditor
          key={conversation.personaId ?? 'new'}
          initialPersonaId={conversation.personaId ?? null}
          conversationId={conversation.id}
          onClose={() => setPersonaEditorOpen(false)}
        />
      )}
    </div>
  )
}
