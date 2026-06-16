import { useEffect, useRef, useState } from 'react'
import { actions, useStore } from '../../store'
import { formatBytes } from '@shared/format'
import { BoxIcon, ChevronRight, CheckIcon } from '../../lib/icons'

export function ModelPicker() {
  const models = useStore((s) => s.installedModels)
  const engine = useStore((s) => s.engine)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const loaded = models.find((m) => m.id === engine.modelId)
  const loading = engine.state === 'loading'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={models.length === 0}
        className="btn-surface h-9 max-w-[320px]"
      >
        <BoxIcon size={15} className="text-sibyl-accent" />
        <span className="truncate">
          {loaded ? loaded.filename.replace(/\.gguf$/i, '') : models.length ? 'Select a model' : 'No models installed'}
        </span>
        <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && models.length > 0 && (
        <div className="absolute left-0 top-11 z-30 max-h-[60vh] w-[360px] animate-fade-in overflow-y-auto rounded-xl border border-sibyl-border bg-sibyl-surface p-1.5 shadow-2xl">
          {models.map((m) => {
            const isLoaded = m.id === engine.modelId
            return (
              <button
                key={m.id}
                disabled={loading}
                onClick={() => {
                  setOpen(false)
                  if (!isLoaded) void actions.loadModel(m.id)
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  isLoaded ? 'bg-sibyl-surface-2' : 'hover:bg-sibyl-surface-2'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-sibyl-text">
                    {m.filename.replace(/\.gguf$/i, '')}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-sibyl-muted">
                    <span className="truncate">{m.repoId}</span>
                    {m.quant && <span className="chip">{m.quant}</span>}
                    <span>{formatBytes(m.sizeBytes)}</span>
                  </div>
                </div>
                {isLoaded && <CheckIcon size={16} className="shrink-0 text-sibyl-accent" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
