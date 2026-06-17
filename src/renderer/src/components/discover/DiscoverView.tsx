import { useEffect } from 'react'
import { actions, useStore, type SortKey } from '../../store'
import { ModelCard } from './ModelCard'
import { ModelDetailDrawer } from './ModelDetailDrawer'
import { SearchIcon } from '../../lib/icons'

const sorts: { key: SortKey; label: string }[] = [
  { key: 'trending', label: 'Trending' },
  { key: 'downloads', label: 'Most downloaded' },
  { key: 'likes', label: 'Most liked' }
]

export function DiscoverView() {
  const { query, sort, results, loading, error } = useStore((s) => s.discover)

  // Initial load of trending models.
  useEffect(() => {
    if (results.length === 0 && !loading) void actions.search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-sibyl-border/60 px-6 py-4">
        <h1 className="mb-1 text-xl font-semibold text-sibyl-text">Discover models</h1>
        <p className="mb-4 text-[13px] text-sibyl-muted">
          Browse GGUF chat models from Hugging Face — search by name, author, or exact repo id.
          Everything you download runs locally.
        </p>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sibyl-muted" />
            <input
              value={query}
              onChange={(e) => actions.setDiscoverQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && actions.search()}
              placeholder="Search models — e.g. Llama, Qwen, Mistral…"
              className="input pl-9"
            />
          </div>
          <button onClick={() => actions.search()} className="btn-primary h-[38px]">
            Search
          </button>
        </div>
        <div className="mt-3 flex gap-1.5">
          {sorts.map((s) => (
            <button
              key={s.key}
              onClick={() => actions.setDiscoverSort(s.key)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                sort === s.key ? 'bg-sibyl-surface-2 text-sibyl-text' : 'text-sibyl-muted hover:text-sibyl-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-xl" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sibyl-muted">
            <SearchIcon size={32} className="mb-3 opacity-40" />
            <p className="text-[14px]">No models found. Try another search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((m) => (
              <ModelCard key={m.id} model={m} onClick={() => actions.openModelDetail(m.id)} />
            ))}
          </div>
        )}
      </div>

      <ModelDetailDrawer />
    </div>
  )
}
