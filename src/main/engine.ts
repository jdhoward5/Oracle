import { EventEmitter } from 'node:events'
import type * as NLC from 'node-llama-cpp'
import type {
  ChatMessage,
  Conversation,
  EngineStatus,
  GenerationEvent,
  GenerationOptions,
  InstalledModel
} from '@shared/types'
import { DEFAULT_GENERATION_OPTIONS } from '@shared/types'
import { getLlamaInstance } from './llama'
import { getInstalledModel, getSettings, upsertInstalledModel } from './store'

/**
 * Owns the single loaded model + active chat session. One model is resident at
 * a time (sized to the user's VRAM); switching conversations reuses the loaded
 * model and only rebuilds the chat session/KV-cache when necessary.
 */
class InferenceEngine extends EventEmitter {
  private llama: NLC.Llama | null = null
  private model: NLC.LlamaModel | null = null
  private context: NLC.LlamaContext | null = null
  private sequence: NLC.LlamaContextSequence | null = null
  private session: NLC.LlamaChatSession | null = null

  private loadedModelId: string | null = null
  private sessionConversationId: string | null = null
  private contextSize: number | null = null

  private state: EngineStatus['state'] = 'idle'
  private lastError: string | undefined
  private abort: AbortController | null = null

  // -- status ---------------------------------------------------------------

  async status(): Promise<EngineStatus> {
    let vramTotal: number | null = null
    let vramUsed: number | null = null
    if (this.llama) {
      try {
        const v = await this.llama.getVramState()
        vramTotal = v.total
        vramUsed = v.used
      } catch {
        /* ignore */
      }
    }
    return {
      state: this.state,
      modelId: this.loadedModelId,
      gpuType: (this.llama?.gpu ?? null) as EngineStatus['gpuType'],
      vramTotalBytes: vramTotal,
      vramUsedBytes: vramUsed,
      contextSize: this.contextSize,
      error: this.lastError
    }
  }

  private async setState(state: EngineStatus['state'], error?: string): Promise<void> {
    this.state = state
    this.lastError = error
    this.emit('status', await this.status())
  }

  // -- model lifecycle ------------------------------------------------------

  async load(modelId: string): Promise<EngineStatus> {
    if (this.loadedModelId === modelId && this.model) {
      return this.status()
    }
    const installed = await getInstalledModel(modelId)
    if (!installed) {
      await this.setState('error', `Model not found: ${modelId}`)
      throw new Error(`Model not found: ${modelId}`)
    }

    await this.unload()
    await this.setState('loading')

    try {
      const settings = await getSettings()
      this.llama = await getLlamaInstance(settings.gpu)

      this.model = await this.llama.loadModel({
        modelPath: installed.path,
        gpuLayers: settings.load.gpuLayers < 0 ? undefined : settings.load.gpuLayers
      })

      // Clamp the requested context to what the model was trained for.
      const trained = this.model.trainContextSize ?? settings.load.contextSize
      const requested = settings.load.contextSize
      this.contextSize = Math.max(512, Math.min(requested, trained))

      // Flash attention is required for models with per-layer KV head counts
      // (e.g. Gemma 4's interleaved sliding-window attention); without it the
      // CUDA backend falls back to a padded V-cache path and warns. It's also a
      // throughput win on modern GPUs, so enable it for every model.
      this.context = await this.model.createContext({
        contextSize: this.contextSize,
        flashAttention: true
      })
      // One persistent sequence + session is reused for every conversation; we
      // swap context via setChatHistory rather than allocating new sequences
      // (a context only exposes a small fixed pool of them).
      const { LlamaChatSession } = await import('node-llama-cpp')
      this.sequence = this.context.getSequence()
      this.session = new LlamaChatSession({
        contextSequence: this.sequence,
        systemPrompt: settings.load.systemPrompt
      })
      this.loadedModelId = modelId
      this.sessionConversationId = null

      // Enrich the registry with metadata learned at load time.
      await this.persistMetadata(installed)

      await this.setState('ready')
      return this.status()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await this.unload()
      await this.setState('error', msg)
      throw err
    }
  }

  private async persistMetadata(installed: InstalledModel): Promise<void> {
    if (!this.model) return
    try {
      const updated: InstalledModel = {
        ...installed,
        trainContextLength: this.model.trainContextSize ?? installed.trainContextLength
      }
      await upsertInstalledModel(updated)
    } catch {
      /* non-fatal */
    }
  }

  async unload(): Promise<void> {
    this.abort?.abort()
    this.abort = null
    try {
      this.session = null
      if (this.sequence) this.sequence.dispose()
      if (this.context) await this.context.dispose()
    } catch {
      /* ignore */
    }
    try {
      if (this.model) await this.model.dispose()
    } catch {
      /* ignore */
    }
    this.sequence = null
    this.context = null
    this.model = null
    this.loadedModelId = null
    this.sessionConversationId = null
    this.contextSize = null
    if (this.state !== 'error') await this.setState('idle')
  }

  // -- chat session ---------------------------------------------------------

  private toHistory(messages: ChatMessage[], systemPrompt: string): NLC.ChatHistoryItem[] {
    const history: NLC.ChatHistoryItem[] = [{ type: 'system', text: systemPrompt }]
    for (const m of messages) {
      if (!m.content.trim()) continue
      if (m.role === 'user') history.push({ type: 'user', text: m.content })
      else if (m.role === 'assistant') history.push({ type: 'model', response: [m.content] })
    }
    return history
  }

  private async ensureSession(conversation: Conversation, currentUserText: string): Promise<NLC.LlamaChatSession> {
    if (!this.session) throw new Error('No model loaded')
    const settings = await getSettings()

    const systemMessage = conversation.messages.find((m) => m.role === 'system')
    const systemPrompt = systemMessage?.content?.trim() || settings.load.systemPrompt

    // Reuse the live session (and its warm KV cache) when continuing the same
    // conversation; otherwise swap the session's history to this conversation.
    if (this.sessionConversationId === conversation.id) {
      return this.session
    }

    // Build prior history, excluding the just-sent user turn and any empty
    // assistant placeholder the renderer pre-allocated.
    const prior = [...conversation.messages]
    while (prior.length) {
      const last = prior[prior.length - 1]
      if (last.role === 'assistant' && !last.content.trim()) {
        prior.pop()
        continue
      }
      if (last.role === 'user' && last.content === currentUserText) {
        prior.pop()
        break
      }
      break
    }
    const history = this.toHistory(
      prior.filter((m) => m.role !== 'system'),
      systemPrompt
    )
    this.session.setChatHistory(history)
    this.sessionConversationId = conversation.id
    return this.session
  }

  async generate(
    conversation: Conversation,
    userText: string,
    assistantMessageId: string,
    optionsOverride: Partial<GenerationOptions> | undefined
  ): Promise<void> {
    if (!this.model || !this.context) {
      this.emitEvent({
        type: 'error',
        conversationId: conversation.id,
        messageId: assistantMessageId,
        error: 'No model is loaded. Load a model first.'
      })
      return
    }

    const settings = await getSettings()
    const opts: GenerationOptions = {
      ...DEFAULT_GENERATION_OPTIONS,
      ...settings.generation,
      ...optionsOverride
    }

    const session = await this.ensureSession(conversation, userText)
    this.abort = new AbortController()
    await this.setState('generating')

    const started = Date.now()
    let completionTokens = 0

    try {
      const responseText = await session.prompt(userText, {
        signal: this.abort.signal,
        stopOnAbortSignal: true,
        temperature: opts.temperature,
        topP: opts.topP,
        topK: opts.topK,
        minP: opts.minP,
        maxTokens: opts.maxTokens,
        seed: opts.seed,
        repeatPenalty: { penalty: opts.repeatPenalty },
        onTextChunk: (chunk: string) => {
          completionTokens += 1
          this.emitEvent({
            type: 'token',
            conversationId: conversation.id,
            messageId: assistantMessageId,
            text: chunk
          })
        }
      })

      const durationMs = Date.now() - started
      // Prefer an exact token count from the model tokenizer.
      try {
        if (this.model && responseText) {
          completionTokens = this.model.tokenize(responseText).length
        }
      } catch {
        /* keep chunk-based estimate */
      }
      const promptTokens = this.estimatePromptTokens(conversation, userText)
      this.emitEvent({
        type: 'done',
        conversationId: conversation.id,
        messageId: assistantMessageId,
        stats: {
          promptTokens,
          completionTokens,
          durationMs,
          tokensPerSecond: durationMs > 0 ? (completionTokens / durationMs) * 1000 : 0
        }
      })
    } catch (err) {
      if (this.abort?.signal.aborted) {
        // Treat user-initiated stop as a graceful completion of partial text.
        const durationMs = Date.now() - started
        this.emitEvent({
          type: 'done',
          conversationId: conversation.id,
          messageId: assistantMessageId,
          stats: {
            promptTokens: this.estimatePromptTokens(conversation, userText),
            completionTokens,
            durationMs,
            tokensPerSecond: durationMs > 0 ? (completionTokens / durationMs) * 1000 : 0
          }
        })
      } else {
        this.emitEvent({
          type: 'error',
          conversationId: conversation.id,
          messageId: assistantMessageId,
          error: err instanceof Error ? err.message : String(err)
        })
      }
    } finally {
      this.abort = null
      await this.setState('ready')
    }
  }

  private estimatePromptTokens(conversation: Conversation, userText: string): number {
    if (!this.model) return 0
    try {
      const text = conversation.messages.map((m) => m.content).join('\n') + '\n' + userText
      return this.model.tokenize(text).length
    } catch {
      return 0
    }
  }

  abortGeneration(): void {
    this.abort?.abort()
  }

  private emitEvent(event: GenerationEvent): void {
    this.emit('event', event)
  }
}

export const engine = new InferenceEngine()
