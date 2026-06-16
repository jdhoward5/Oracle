// Pure helpers for context-window accounting and presentation.
// No runtime deps so it is safe in the renderer and unit-testable.

import type { ContextLevel } from './types'

/**
 * Classify how full the context window is. `warn` and `critical` are fractions
 * (0..1); `critical` is where auto-compaction kicks in and should be >= `warn`.
 */
export function contextLevel(fraction: number, warn: number, critical: number): ContextLevel {
  if (!Number.isFinite(fraction)) return 'ok'
  if (fraction >= critical) return 'critical'
  if (fraction >= warn) return 'warn'
  return 'ok'
}

/**
 * Cheap, dependency-free token estimate for live UI (e.g. the composer counter).
 * Approximates ~4 chars/token — the same fallback the engine uses when the real
 * tokenizer is unavailable. Not exact; prefix displays with "~".
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

/** Compact a token count to a short label, e.g. 950 → "950", 8400 → "8.4K". */
export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  const r = Math.round(n)
  if (r < 1000) return String(r)
  const k = r / 1000
  return `${k < 10 ? k.toFixed(1) : Math.round(k)}K`
}

/** Whole-percent fill for a 0..1 fraction, clamped to 0..100. */
export function contextPercent(fraction: number): number {
  if (!Number.isFinite(fraction) || fraction <= 0) return 0
  return Math.min(100, Math.round(fraction * 100))
}

/** Tailwind text/bg accent class per severity, for consistent meter colours. */
export function levelColor(level: ContextLevel): { text: string; bar: string } {
  switch (level) {
    case 'critical':
      return { text: 'text-rose-400', bar: 'bg-rose-500' }
    case 'warn':
      return { text: 'text-amber-400', bar: 'bg-amber-500' }
    default:
      return { text: 'text-sibyl-muted', bar: 'bg-sibyl-accent' }
  }
}
