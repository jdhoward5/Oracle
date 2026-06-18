import { useState } from 'react'
import type { GenerationOptions, Persona } from '@shared/types'
import { actions, uid, useStore } from '../../store'
import { estimateTokens } from '@shared/context'
import { gradientFor, initialsOf } from '@shared/personas'
import { Avatar } from './Avatar'
import { Slider } from '../common/controls'
import { XIcon, PlusIcon, TrashIcon } from '../../lib/icons'

/** Sampling defaults for a fresh persona — roleplay tends to want the creative profile. */
const CREATIVE: GenerationOptions = {
  temperature: 0.9,
  topP: 0.92,
  topK: 60,
  minP: 0.03,
  maxTokens: 2048,
  repeatPenalty: 1.08
}

function blankPersona(): Persona {
  const id = uid()
  return {
    id,
    name: '',
    role: '',
    brief: '',
    greeting: '',
    avatar: { monogram: '?', gradient: gradientFor(id) },
    voiceTags: [],
    generation: undefined
  }
}

interface Props {
  /** Persona to open in the form; omit/null to start a new one. */
  initialPersonaId?: string | null
  /** When set, "Apply" also points this thread at the (saved) persona. */
  conversationId?: string | null
  onClose: () => void
}

/**
 * Right-side drawer that edits a persona in the library: name, role, character
 * brief, voice tags, opening message and per-persona sampling. The library
 * switcher row hops between saved personas (or starts a new one).
 */
export function PersonaEditor({ initialPersonaId, conversationId, onClose }: Props) {
  const personas = useStore((s) => s.settings?.personas ?? [])
  const initial = personas.find((p) => p.id === initialPersonaId) ?? null
  const [draft, setDraft] = useState<Persona>(initial ? structuredClone(initial) : blankPersona())
  const [samplingOn, setSamplingOn] = useState(Boolean(initial?.generation))
  const [tagDraft, setTagDraft] = useState('')

  const set = (patch: Partial<Persona>): void => setDraft((d) => ({ ...d, ...patch }))
  const setName = (name: string): void =>
    setDraft((d) => ({ ...d, name, avatar: { ...d.avatar, monogram: initialsOf(name || '?') } }))
  const setGen = (patch: Partial<GenerationOptions>): void =>
    setDraft((d) => ({ ...d, generation: { ...(d.generation ?? CREATIVE), ...patch } }))

  const loadPersona = (p: Persona | null): void => {
    const next = p ? structuredClone(p) : blankPersona()
    setDraft(next)
    setSamplingOn(Boolean(next.generation))
  }

  const addTag = (): void => {
    const t = tagDraft.trim()
    if (t && !draft.voiceTags.includes(t)) set({ voiceTags: [...draft.voiceTags, t] })
    setTagDraft('')
  }

  const canSave = draft.name.trim().length > 0
  // Whether the persona currently in the form already exists in the library
  // (the library switcher can change `draft` away from the one opened at mount).
  const isSaved = personas.some((p) => p.id === draft.id)

  const commit = (apply: boolean): void => {
    if (!canSave) return
    const persona: Persona = {
      ...draft,
      name: draft.name.trim(),
      role: draft.role.trim(),
      brief: draft.brief.trim(),
      greeting: draft.greeting?.trim() || undefined,
      avatar: { ...draft.avatar, monogram: initialsOf(draft.name) },
      generation: samplingOn ? (draft.generation ?? CREATIVE) : undefined
    }
    actions.savePersona(persona)
    if (apply && conversationId) void actions.setConversationPersona(conversationId, persona.id)
    onClose()
  }

  const briefTokens = estimateTokens(draft.brief)

  return (
    <div className="no-drag fixed bottom-0 left-0 right-0 top-10 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[480px] animate-fade-in flex-col border-l border-sibyl-border bg-sibyl-sunken shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-sibyl-border/60 px-5 py-4">
          <div>
            <div className="eyebrow text-sibyl-accent">// Persona</div>
            <h2 className="mt-1 font-mono text-[18px] font-bold text-sibyl-text">
              {isSaved ? 'Edit persona' : 'New persona'}
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost h-8 w-8 p-0">
            <XIcon size={16} />
          </button>
        </div>

        {/* library switcher */}
        <div className="border-b border-sibyl-border/60 px-5 py-3.5">
          <div className="eyebrow mb-2.5 text-[10.5px]">Library</div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {personas.map((p) => (
              <button key={p.id} onClick={() => loadPersona(p)} title={p.name} className="shrink-0">
                <Avatar
                  avatar={p.avatar}
                  size={34}
                  glow={false}
                  ring={p.id === draft.id ? 'rgb(var(--sibyl-accent))' : undefined}
                />
              </button>
            ))}
            <button
              onClick={() => loadPersona(null)}
              title="New persona"
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-dashed border-sibyl-border text-sibyl-muted hover:text-sibyl-text"
            >
              <PlusIcon size={14} />
            </button>
          </div>
        </div>

        {/* form */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-[18px]">
            <div className="flex items-center gap-3">
              <Avatar avatar={draft.avatar} size={52} />
              <div className="flex-1">
                <div className="eyebrow mb-1.5 text-[10.5px]">Name</div>
                <input value={draft.name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Persona name" />
              </div>
            </div>

            <div>
              <div className="eyebrow mb-1.5 text-[10.5px]">Role · one line</div>
              <input
                value={draft.role}
                onChange={(e) => set({ role: e.target.value })}
                className="input"
                placeholder="e.g. Caravan guard escorting the player"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="eyebrow text-[10.5px]">Character brief · system prompt</span>
                <span className="font-mono text-[10px] text-sibyl-faint">~{briefTokens} tok</span>
              </div>
              <textarea
                value={draft.brief}
                onChange={(e) => set({ brief: e.target.value })}
                rows={5}
                placeholder="Who is this character? How do they speak and behave?"
                className="input resize-none text-[13px] leading-[1.6] focus:ring-2 focus:ring-sibyl-accent/10"
              />
            </div>

            <div>
              <div className="eyebrow mb-1.5 text-[10.5px]">Voice</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {draft.voiceTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => set({ voiceTags: draft.voiceTags.filter((x) => x !== t) })}
                    title="Remove tag"
                    className="flex items-center gap-1 rounded-full border border-sibyl-accent-2/30 bg-sibyl-accent-2/10 px-2.5 py-1 font-mono text-[10.5px] text-sibyl-accent-2"
                  >
                    {t} <XIcon size={10} />
                  </button>
                ))}
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  onBlur={addTag}
                  placeholder="+ tag"
                  className="w-[72px] rounded-full border border-dashed border-sibyl-border bg-transparent px-2.5 py-1 font-mono text-[10.5px] text-sibyl-muted outline-none focus:border-sibyl-accent/40"
                />
              </div>
            </div>

            <div>
              <div className="eyebrow mb-1.5 text-[10.5px]">Opening message</div>
              <textarea
                value={draft.greeting ?? ''}
                onChange={(e) => set({ greeting: e.target.value })}
                rows={2}
                placeholder="Optional — seeds the first in-character message of a new thread."
                className="input resize-none text-[13px] leading-[1.55]"
              />
            </div>

            <div className="border-t border-sibyl-border/60 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow text-[10.5px]">Sampling</span>
                <button
                  role="switch"
                  aria-checked={samplingOn}
                  onClick={() => setSamplingOn((v) => !v)}
                  className={`relative h-[18px] w-[34px] shrink-0 rounded-full transition-colors ${
                    samplingOn ? 'bg-sibyl-accent/40' : 'bg-sibyl-surface-2'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
                      samplingOn ? 'left-[17px] bg-sibyl-accent' : 'left-0.5 bg-sibyl-muted'
                    }`}
                  />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <Slider
                  label="Temperature"
                  value={draft.generation?.temperature ?? CREATIVE.temperature}
                  min={0}
                  max={2}
                  step={0.05}
                  disabled={!samplingOn}
                  onChange={(v) => setGen({ temperature: v })}
                  format={(v) => v.toFixed(2)}
                />
                <Slider
                  label="Top-P"
                  value={draft.generation?.topP ?? CREATIVE.topP}
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={!samplingOn}
                  onChange={(v) => setGen({ topP: v })}
                  format={(v) => v.toFixed(2)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-2 border-t border-sibyl-border/60 px-5 py-3.5">
          {isSaved ? (
            <button
              onClick={() => {
                actions.deletePersona(draft.id)
                onClose()
              }}
              className="btn-ghost px-2.5 py-1.5 text-[12.5px] hover:text-red-300"
            >
              <TrashIcon size={13} /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost px-3 py-1.5 text-[12.5px]">
              Cancel
            </button>
            {conversationId && (
              <button onClick={() => commit(false)} disabled={!canSave} className="btn-surface px-3 py-1.5 text-[12.5px]">
                Save only
              </button>
            )}
            <button onClick={() => commit(true)} disabled={!canSave} className="btn-primary px-4 py-1.5 text-[12.5px]">
              {conversationId ? 'Apply' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
