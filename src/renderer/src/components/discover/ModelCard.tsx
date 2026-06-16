import type { HFModelSummary } from '@shared/types'
import { DownloadIcon, HeartIcon } from '../../lib/icons'

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function ModelCard({ model, onClick }: { model: HFModelSummary; onClick: () => void }) {
  const [author, name] = model.id.includes('/') ? model.id.split(/\/(.*)/s) : ['', model.id]
  return (
    <button
      onClick={onClick}
      className="card group flex flex-col gap-3 p-4 text-left transition-all duration-150 hover:border-sibyl-accent/50 hover:bg-sibyl-surface-2"
    >
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold text-sibyl-text group-hover:text-white" title={name}>
          {name}
        </div>
        <div className="truncate text-[12px] text-sibyl-muted">{author}</div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {model.gated && <span className="chip border border-amber-500/30 text-amber-300/90">gated</span>}
        {model.tags
          .filter((t) => /^(text-generation|conversational|llama|qwen|mistral|gemma|phi|gguf)/i.test(t))
          .slice(0, 3)
          .map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
      </div>
      <div className="mt-auto flex items-center gap-4 text-[11.5px] text-sibyl-muted">
        <span className="flex items-center gap-1">
          <DownloadIcon size={13} /> {compact(model.downloads)}
        </span>
        <span className="flex items-center gap-1">
          <HeartIcon size={13} /> {compact(model.likes)}
        </span>
      </div>
    </button>
  )
}
