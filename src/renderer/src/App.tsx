import { useEffect } from 'react'
import { actions, useStore } from './store'
import { TitleBar } from './components/TitleBar'
import { Rail } from './components/Rail'
import { ChatView } from './components/chat/ChatView'
import { DiscoverView } from './components/discover/DiscoverView'
import { ModelsView } from './components/models/ModelsView'
import { SettingsView } from './components/settings/SettingsView'
import { DownloadsBar } from './components/common/DownloadsBar'
import { Toast } from './components/common/Toast'

export default function App() {
  const ready = useStore((s) => s.ready)
  const view = useStore((s) => s.view)

  useEffect(() => {
    void actions.init()
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-oracle-bg text-oracle-text">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Rail />
        <main className="flex min-w-0 flex-1 flex-col">
          {!ready ? (
            <div className="flex flex-1 items-center justify-center">
              <span className="h-3 w-3 animate-pulse-glow rounded-full bg-oracle-accent" />
            </div>
          ) : view === 'chat' ? (
            <ChatView />
          ) : view === 'discover' ? (
            <DiscoverView />
          ) : view === 'models' ? (
            <ModelsView />
          ) : (
            <SettingsView />
          )}
        </main>
      </div>
      <DownloadsBar />
      <Toast />
    </div>
  )
}
