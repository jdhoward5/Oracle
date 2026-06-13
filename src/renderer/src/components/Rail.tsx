import { actions, useStore, type View } from '../store'
import { ChatIcon, CompassIcon, BoxIcon, SettingsIcon } from '../lib/icons'

const items: { view: View; label: string; Icon: typeof ChatIcon }[] = [
  { view: 'chat', label: 'Chat', Icon: ChatIcon },
  { view: 'discover', label: 'Discover', Icon: CompassIcon },
  { view: 'models', label: 'Models', Icon: BoxIcon },
  { view: 'settings', label: 'Settings', Icon: SettingsIcon }
]

export function Rail() {
  const view = useStore((s) => s.view)
  const modelCount = useStore((s) => s.installedModels.length)
  const downloadCount = useStore(
    (s) => Object.values(s.downloads).filter((d) => d.status === 'downloading' || d.status === 'queued').length
  )

  return (
    <nav className="flex w-[68px] shrink-0 flex-col items-center gap-1 border-r border-oracle-border/60 bg-oracle-bg py-3">
      {items.map(({ view: v, label, Icon }) => {
        const active = view === v
        const badge = v === 'models' && downloadCount > 0 ? downloadCount : 0
        return (
          <button
            key={v}
            onClick={() => actions.setView(v)}
            className={`no-drag group relative flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-150 ${
              active
                ? 'bg-oracle-surface-2 text-oracle-text'
                : 'text-oracle-muted hover:bg-oracle-surface hover:text-oracle-text'
            }`}
            title={label}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r bg-oracle-accent" />
            )}
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
            {badge > 0 && (
              <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-oracle-accent px-1 text-[9px] font-bold text-white">
                {badge}
              </span>
            )}
            {v === 'models' && badge === 0 && modelCount > 0 && (
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-oracle-accent/60" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
