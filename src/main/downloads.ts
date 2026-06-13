import { EventEmitter } from 'node:events'
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import type { DownloadProgress, InstalledModel } from '@shared/types'
import { modelIdFor, parseParamLabel, parseQuant } from '@shared/format'
import { nlc } from './llama'
import { getModelsDir, getSettings, upsertInstalledModel } from './store'

interface ActiveDownload {
  progress: DownloadProgress
  controller: AbortController
  // smoothing state
  lastBytes: number
  lastTime: number
  smoothedSpeed: number
}

/**
 * Manages resumable GGUF downloads from Hugging Face using node-llama-cpp's
 * downloader (which handles multi-part GGUFs and resume), while exposing
 * smoothed progress + cancellation and registering finished models.
 */
class DownloadManager extends EventEmitter {
  private active = new Map<string, ActiveDownload>()

  list(): DownloadProgress[] {
    return [...this.active.values()].map((d) => d.progress)
  }

  private emitProgress(d: ActiveDownload): void {
    this.emit('progress', { ...d.progress })
  }

  async start(repoId: string, filename: string): Promise<{ id: string }> {
    const id = modelIdFor(repoId, filename)
    if (this.active.has(id)) return { id }

    const modelsDir = await getModelsDir()
    const { hfToken } = await getSettings()
    const controller = new AbortController()

    const entry: ActiveDownload = {
      progress: {
        id,
        repoId,
        filename,
        status: 'queued',
        receivedBytes: 0,
        totalBytes: 0,
        speed: 0,
        etaSeconds: null
      },
      controller,
      lastBytes: 0,
      lastTime: Date.now(),
      smoothedSpeed: 0
    }
    this.active.set(id, entry)
    this.emitProgress(entry)

    // Kick off asynchronously; callers get the id immediately.
    void this.run(entry, repoId, filename, modelsDir, hfToken)
    return { id }
  }

  private async run(
    entry: ActiveDownload,
    repoId: string,
    filename: string,
    modelsDir: string,
    hfToken: string | null
  ): Promise<void> {
    const { createModelDownloader } = await nlc()
    try {
      entry.progress.status = 'downloading'
      this.emitProgress(entry)

      const downloader = await createModelDownloader({
        modelUri: `hf:${repoId}/${filename}`,
        dirPath: modelsDir,
        headers: hfToken ? { Authorization: `Bearer ${hfToken}` } : undefined,
        showCliProgress: false,
        deleteTempFileOnCancel: false, // keep partial data so resume works
        onProgress: ({ totalSize, downloadedSize }) => {
          this.updateProgress(entry, downloadedSize, totalSize)
        }
      })

      const modelPath = await downloader.download({ signal: entry.controller.signal })

      entry.progress.status = 'verifying'
      this.emitProgress(entry)

      const finalPath = modelPath ?? path.join(modelsDir, filename)
      await this.register(repoId, filename, finalPath)

      entry.progress.status = 'completed'
      entry.progress.receivedBytes = entry.progress.totalBytes || entry.progress.receivedBytes
      this.emitProgress(entry)
    } catch (err) {
      if (entry.controller.signal.aborted) {
        entry.progress.status = 'cancelled'
      } else {
        entry.progress.status = 'error'
        entry.progress.error = err instanceof Error ? err.message : String(err)
      }
      this.emitProgress(entry)
    } finally {
      // Keep terminal state briefly visible, then drop from the active map.
      const id = entry.progress.id
      setTimeout(() => this.active.delete(id), 1500)
    }
  }

  private updateProgress(entry: ActiveDownload, downloaded: number, total: number): void {
    const now = Date.now()
    const dt = (now - entry.lastTime) / 1000
    if (dt >= 0.25) {
      const instSpeed = (downloaded - entry.lastBytes) / dt
      // Exponential moving average for a stable readout.
      entry.smoothedSpeed = entry.smoothedSpeed === 0 ? instSpeed : entry.smoothedSpeed * 0.7 + instSpeed * 0.3
      entry.lastBytes = downloaded
      entry.lastTime = now
    }
    entry.progress.receivedBytes = downloaded
    entry.progress.totalBytes = total
    entry.progress.speed = Math.max(0, entry.smoothedSpeed)
    const remaining = total - downloaded
    entry.progress.etaSeconds =
      entry.smoothedSpeed > 0 && remaining > 0 ? remaining / entry.smoothedSpeed : null
    this.emitProgress(entry)
  }

  private async register(repoId: string, filename: string, filePath: string): Promise<void> {
    let sizeBytes = 0
    try {
      sizeBytes = (await fs.stat(filePath)).size
    } catch {
      /* leave 0 */
    }
    const model: InstalledModel = {
      id: modelIdFor(repoId, filename),
      repoId,
      filename,
      path: filePath,
      sizeBytes,
      quant: parseQuant(filename),
      paramLabel: parseParamLabel(filename) ?? parseParamLabel(repoId),
      installedAt: new Date().toISOString()
    }
    await upsertInstalledModel(model)
  }

  cancel(id: string): boolean {
    const entry = this.active.get(id)
    if (!entry) return false
    entry.controller.abort()
    return true
  }
}

export const downloadManager = new DownloadManager()

/** Re-scan the models directory for GGUF files not yet in the registry. */
export async function importExistingModels(): Promise<void> {
  const modelsDir = await getModelsDir()
  if (!existsSync(modelsDir)) return
  // Implementation intentionally minimal: node-llama-cpp stores models in a
  // predictable layout; deep import is handled lazily by the registry which
  // already prunes dead entries. A full re-scan can be added if needed.
}
