// Shared domain types used by main, preload and renderer.
// Keep this file free of any runtime/node imports — it must be safe to load in the renderer.

export interface HFModelSummary {
  id: string // e.g. "bartowski/Llama-3.2-3B-Instruct-GGUF"
  author: string
  downloads: number
  likes: number
  lastModified: string
  tags: string[]
  /** Best-effort pipeline tag, e.g. "text-generation". */
  pipelineTag?: string
  gated: boolean
}

export interface HFGGUFFile {
  /** Filename within the repo, e.g. "Llama-3.2-3B-Instruct-Q4_K_M.gguf". */
  rfilename: string
  /** Size in bytes when known. */
  size?: number
  /** Parsed quantization label, e.g. "Q4_K_M". */
  quant?: string
  /** True if this is one shard of a multi-part GGUF. */
  multipart: boolean
}

export interface HFModelDetail extends HFModelSummary {
  ggufFiles: HFGGUFFile[]
  /** README excerpt for display. */
  description?: string
}

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'verifying'
  | 'completed'
  | 'error'
  | 'cancelled'

export interface DownloadProgress {
  id: string // unique download id
  repoId: string
  filename: string
  status: DownloadStatus
  receivedBytes: number
  totalBytes: number
  /** Bytes/sec, smoothed. */
  speed: number
  /** Estimated seconds remaining, or null when unknown. */
  etaSeconds: number | null
  error?: string
}

/** A model file installed on disk and ready to load. */
export interface InstalledModel {
  id: string // stable id derived from repoId + filename
  repoId: string
  filename: string
  path: string
  sizeBytes: number
  quant?: string
  /** Parameter count label parsed from metadata/name, e.g. "3B". */
  paramLabel?: string
  /** Max context length advertised by the GGUF metadata. */
  trainContextLength?: number
  /** Detected chat template family. */
  chatWrapper?: string
  installedAt: string
}

export interface ChatMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  createdAt: string
  /** Generation stats attached to assistant messages once complete. */
  stats?: GenerationStats
}

export interface GenerationStats {
  promptTokens: number
  completionTokens: number
  tokensPerSecond: number
  durationMs: number
}

export interface Conversation {
  id: string
  title: string
  modelId: string | null
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface GenerationOptions {
  temperature: number
  topP: number
  topK: number
  minP: number
  maxTokens: number
  /** Repeat penalty applied over the recent window. */
  repeatPenalty: number
  seed?: number
}

export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  minP: 0.05,
  maxTokens: 2048,
  repeatPenalty: 1.1
}

export interface LoadOptions {
  /** Number of layers to offload to GPU; -1 = auto/max. */
  gpuLayers: number
  /** Context window size in tokens. */
  contextSize: number
  /** System prompt seeded into new sessions. */
  systemPrompt: string
}

export interface AppSettings {
  /** Directory where GGUF models are stored. */
  modelsDir: string
  /** Optional Hugging Face token for gated/private models. Stored encrypted at rest. */
  hfToken: string | null
  generation: GenerationOptions
  load: Omit<LoadOptions, 'systemPrompt'> & { systemPrompt: string }
  theme: 'dark' | 'light'
  /** Preferred GPU backend; 'auto' lets the engine decide. */
  gpu: 'auto' | 'cuda' | 'vulkan' | 'cpu'
  telemetry: false // Oracle never sends telemetry.
}

export interface EngineStatus {
  state: 'idle' | 'loading' | 'ready' | 'generating' | 'error'
  modelId: string | null
  gpuType: 'cuda' | 'vulkan' | 'metal' | false | null
  vramTotalBytes: number | null
  vramUsedBytes: number | null
  contextSize: number | null
  error?: string
}

/** Streaming events emitted from main → renderer during generation. */
export type GenerationEvent =
  | { type: 'token'; conversationId: string; messageId: string; text: string }
  | { type: 'done'; conversationId: string; messageId: string; stats: GenerationStats }
  | { type: 'error'; conversationId: string; messageId: string; error: string }

export interface Result<T> {
  ok: boolean
  data?: T
  error?: string
}
