import { EventEmitter } from 'node:events'
import { app } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '@shared/types'
import { teardownGpu } from './shutdown'

// electron-updater is CommonJS; under this ESM project we take the default export
// and destructure the singleton.
const { autoUpdater } = electronUpdater

/**
 * Wraps electron-updater behind the same event-emitter shape the rest of the
 * main process uses (cf. `engine`, `downloadManager`). It keeps a single
 * `UpdateStatus` snapshot and emits `status` whenever it changes; `ipc.ts`
 * forwards that to the renderer over `IPC.updateEvent`.
 *
 * Policy (see plan): check automatically on launch, but never download or
 * install without an explicit user action — installers are hundreds of MB.
 * Pre-releases are eligible because Sibyl currently ships only `beta.N` tags.
 */
class Updater extends EventEmitter {
  private status: UpdateStatus = { state: 'idle', currentVersion: app.getVersion() }
  private initialized = false

  /** Attach electron-updater listeners exactly once. */
  init(): void {
    if (this.initialized) return
    this.initialized = true

    autoUpdater.autoDownload = false // user clicks "Download"
    autoUpdater.allowPrerelease = true // beta.N releases are eligible
    autoUpdater.autoInstallOnAppQuit = false // we drive install explicitly

    autoUpdater.on('checking-for-update', () => this.set({ state: 'checking' }))
    autoUpdater.on('update-available', (info) =>
      this.set({
        state: 'available',
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
      })
    )
    autoUpdater.on('update-not-available', () =>
      this.set({ state: 'not-available', version: undefined })
    )
    autoUpdater.on('download-progress', (p) =>
      this.set({ state: 'downloading', percent: p.percent, bytesPerSecond: p.bytesPerSecond })
    )
    autoUpdater.on('update-downloaded', (info) =>
      this.set({ state: 'downloaded', version: info.version })
    )
    autoUpdater.on('error', (err) =>
      this.set({ state: 'error', error: err == null ? 'Unknown update error' : err.message || String(err) })
    )
  }

  getStatus(): UpdateStatus {
    return this.status
  }

  /** Check GitHub for a newer release. No-ops (and reports) when unpackaged. */
  async check(): Promise<UpdateStatus> {
    if (!app.isPackaged) {
      this.set({ state: 'dev-disabled' })
      return this.status
    }
    this.init()
    await autoUpdater.checkForUpdates()
    return this.status
  }

  /** Download the available update (user-initiated). */
  async download(): Promise<void> {
    if (!app.isPackaged) return
    this.init()
    await autoUpdater.downloadUpdate()
  }

  /**
   * Quit and install a downloaded update.
   *
   * We dispose the GPU *before* spawning the installer. `quitAndInstall` launches
   * the NSIS installer immediately (then triggers app quit); the installer checks
   * whether Sibyl is still running and, if so, shows "Sibyl cannot be closed".
   * Our `before-quit` teardown is async (it disposes the CUDA backend, which must
   * not be torn out from under a live process), so doing it here first lets the
   * process exit the instant `quitAndInstall` fires — the running-check passes.
   * `teardownGpu()` is idempotent, so the `before-quit` handler that follows is a
   * no-op resolve rather than a second dispose.
   *
   * `isSilent=false` shows the installer UI; `isForceRunAfter=true` relaunches.
   */
  async install(): Promise<void> {
    if (!app.isPackaged) return
    // Dispose the GPU *while the app is still healthy*, so the imminent quit has
    // nothing left to tear down — disposing during exit is what risks a stuck
    // process that holds the app's files open and trips the installer's locked-
    // file "Sibyl cannot be closed" retries. Bounded: never let a slow/stuck
    // dispose block the install. Anything we don't reclaim, the OS does on exit,
    // and the installer waits for the process to fully go (see build/installer.nsh).
    try {
      await Promise.race([teardownGpu(), new Promise<void>((resolve) => setTimeout(resolve, 6000))])
    } catch {
      /* teardownGpu swallows its own errors; never block the install on it */
    }
    autoUpdater.quitAndInstall(false, true)
  }

  private set(patch: Partial<UpdateStatus>): void {
    this.status = { ...this.status, ...patch }
    this.emit('status', this.status)
  }
}

export const updater = new Updater()

export const initUpdater = (): void => updater.init()
export const checkForUpdates = (): Promise<UpdateStatus> => updater.check()
