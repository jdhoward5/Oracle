import { useState } from 'react'
import { actions, useStore } from '../../store'
import { PersonaCard } from './PersonaCard'
import { PersonaEditor } from './PersonaEditor'
import { PlusIcon, ChevronRight } from '../../lib/icons'

/**
 * The new-thread persona picker shown over the chat column. Pick a saved persona
 * (sets prompt, voice and sampling) or start blank, then begin the thread.
 */
export function PersonaPicker({ canCancel }: { canCancel: boolean }) {
  const personas = useStore((s) => s.settings?.personas ?? [])
  // `undefined` = nothing chosen yet, `null` = explicitly blank thread.
  const [selected, setSelected] = useState<string | null | undefined>(personas[0]?.id)
  const [editorOpen, setEditorOpen] = useState(false)

  const chosen = personas.find((p) => p.id === selected) ?? null

  const start = (personaId: string | null): void => {
    actions.newConversation(personaId ?? undefined)
    actions.closePersonaPicker()
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{
        background:
          'radial-gradient(900px 380px at 50% -8%, rgb(var(--sibyl-accent) / 0.06), transparent 70%)'
      }}
    >
      <div className="mx-auto max-w-[760px] px-8 pb-12 pt-14">
        <div className="eyebrow mb-2.5 text-sibyl-accent">// New thread</div>
        <h2 className="mb-2 font-mono text-[28px] font-extrabold tracking-tight text-sibyl-text">
          Who are you writing with?
        </h2>
        <p className="mb-7 text-[14.5px] leading-relaxed text-sibyl-muted">
          Pick a saved persona — it sets the character brief, voice and sampling — or start blank.
        </p>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {personas.map((p) => (
            <PersonaCard key={p.id} persona={p} selected={selected === p.id} onClick={() => setSelected(p.id)} />
          ))}

          {/* Blank thread */}
          <button
            onClick={() => setSelected(null)}
            className={`flex items-center gap-3 rounded-lg border bg-sibyl-surface p-4 text-left transition-colors ${
              selected === null ? 'border-sibyl-accent/60 ring-[3px] ring-sibyl-accent/10' : 'border-sibyl-border hover:border-sibyl-accent/40'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-sibyl-border text-sibyl-muted">
              <PlusIcon size={18} />
            </div>
            <div>
              <div className="font-mono text-[14px] font-bold text-sibyl-text">Blank thread</div>
              <div className="text-[12px] text-sibyl-muted">No persona · global prompt</div>
            </div>
          </button>

          {/* New persona */}
          <button
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-3 rounded-lg border border-dashed border-sibyl-accent/40 bg-sibyl-accent/[0.04] p-4 text-left transition-colors hover:bg-sibyl-accent/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sibyl-accent/15 text-sibyl-accent">
              <PlusIcon size={18} />
            </div>
            <div>
              <div className="font-mono text-[14px] font-bold text-sibyl-accent">New persona</div>
              <div className="text-[12px] text-sibyl-muted">Build one from scratch</div>
            </div>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          {canCancel && (
            <button onClick={() => actions.closePersonaPicker()} className="btn-ghost px-4 py-2.5 text-[13px]">
              Cancel
            </button>
          )}
          <button
            onClick={() => start(selected === undefined ? null : selected)}
            className="btn-primary h-[42px] px-5 text-[14px]"
          >
            {chosen ? `Start with ${chosen.name}` : 'Start blank thread'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {editorOpen && (
        <PersonaEditor
          onClose={() => setEditorOpen(false)}
          // Newly-saved persona becomes selectable; pre-select the freshest one after close.
        />
      )}
    </div>
  )
}
