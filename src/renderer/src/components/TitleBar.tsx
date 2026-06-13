import { useStore } from '../store'
import { SparkIcon } from '../lib/icons'
import { EngineBadge } from './common/EngineBadge'

export function TitleBar() {
  const appInfo = useStore((s) => s.appInfo)
  return (
    <header className="drag-region flex h-10 shrink-0 items-center justify-between border-b border-oracle-border/60 bg-oracle-bg pl-3 pr-[140px]">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-oracle-accent to-oracle-accent-2 text-white shadow-md shadow-oracle-accent/30">
          <SparkIcon size={15} />
        </div>
        <span className="text-[13px] font-semibold tracking-wide text-oracle-text">Oracle</span>
        {appInfo && (
          <span className="text-[11px] text-oracle-muted/70">v{appInfo.version}</span>
        )}
      </div>
      <EngineBadge />
    </header>
  )
}
