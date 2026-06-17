// Small pure formatting/parsing helpers shared across processes.
// No runtime deps so it is safe in the renderer and unit-testable.

/** Format a byte count into a human readable string (e.g. "3.4 GB"). */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`
}

/** Format a transfer speed in bytes/sec. */
export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '—'
  return `${formatBytes(bytesPerSecond)}/s`
}

/** Format an ETA in seconds into "1m 20s" style. */
export function formatEta(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

const QUANT_RE = /\b(IQ\d[\w]*|Q\d(?:_[\w]+)*|F16|F32|BF16)\b/i

/** Parse a quantization label like "Q4_K_M" from a GGUF filename. */
export function parseQuant(filename: string): string | undefined {
  const m = filename.match(QUANT_RE)
  return m ? m[1].toUpperCase() : undefined
}

const PARAM_RE = /\b(\d+(?:\.\d+)?)\s*[xX]?\s*([BM])\b/i

/** Parse a parameter-size label like "3B" or "7B" from a repo or filename. */
export function parseParamLabel(name: string): string | undefined {
  const m = name.match(PARAM_RE)
  if (!m) return undefined
  return `${m[1]}${m[2].toUpperCase()}`
}

/** Detect whether a GGUF filename is one shard of a multi-part model. */
export function isMultipartGGUF(filename: string): boolean {
  return /-\d{5}-of-\d{5}\.gguf$/i.test(filename)
}

/** Stable id for an installed model derived from repo + filename. */
export function modelIdFor(repoId: string, filename: string): string {
  return `${repoId}/${filename}`.replace(/[^a-zA-Z0-9._/-]/g, '_')
}

/** Approximate ordering rank for quant quality (higher = better quality). */
export function quantRank(quant: string | undefined): number {
  if (!quant) return 0
  const q = quant.toUpperCase()
  if (q === 'F32') return 100
  if (q === 'F16' || q === 'BF16') return 95
  const m = q.match(/Q(\d)/)
  const bits = m ? Number(m[1]) : 0
  let rank = bits * 10
  if (q.includes('_K_M')) rank += 3
  else if (q.includes('_K_L')) rank += 4
  else if (q.includes('_K_S')) rank += 2
  if (q.startsWith('IQ')) rank -= 1
  return rank
}

const NSFW_TAGS = new Set(['not-for-all-audiences', 'nsfw'])

/** True when a model is tagged as adult / not-for-all-audiences content. */
export function isNsfwModel(tags: string[]): boolean {
  return tags.some((t) => NSFW_TAGS.has(t.toLowerCase()))
}

const DESCRIPTOR_RE =
  /^(instruct|chat|conversational|uncensored|roleplay|writing|code|coding|reasoning|thinking|vision|multimodal|moe|merge|distill|abliterated|finetune)$/i

/**
 * Pick the most informative descriptor tags (what the model is *for*) to show as
 * chips, de-duplicated and capped. Skips noise like language codes, base-model
 * refs and tooling tags.
 */
export function descriptorTags(tags: string[], max = 3): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tags) {
    const tag = t.toLowerCase()
    if (!DESCRIPTOR_RE.test(tag) || seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
    if (out.length >= max) break
  }
  return out
}

/** Truncate text to a max length adding an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}
