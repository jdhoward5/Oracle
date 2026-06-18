// Persona helpers + the starter library. Pure data — safe to load in the
// renderer (no node/electron imports). The Persona type lives in `types.ts`.

import type { Persona } from './types'

/** Initials for a monogram avatar, e.g. "Mara Vesk" → "MV", "Notetaker" → "NO". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Curated 2-stop avatar gradients (Eagle palette). */
const GRADIENTS: [string, string][] = [
  ['#ffa3b8', '#a66878'],
  ['#a8b0ff', '#6b70b0'],
  ['#7cf5a0', '#45925c'],
  ['#5ee7ff', '#3c93a4'],
  ['#ffbfa3', '#a67a68'],
  ['#ffc266', '#a6823f'],
  ['#b8b8c0', '#4a4a52']
]

/** Deterministic gradient pick from a seed string (so a persona keeps its colour). */
export function gradientFor(seed: string): [string, string] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}

/** Resolve a persona by id, tolerating null/unknown ids. */
export function findPersona(
  personas: Persona[] | undefined,
  id: string | null | undefined
): Persona | null {
  if (!personas || !id) return null
  return personas.find((p) => p.id === id) ?? null
}

/** Starter personas shown the first time, so the picker isn't empty. Deletable. */
export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'persona-mara-vesk',
    name: 'Mara Vesk',
    role: 'Caravan guard',
    brief:
      'You are Mara Vesk, a hardened caravan guard escorting the player across the Saltflats. ' +
      'Speak in clipped, wary lines with dry humor. Stay in third-person present tense, describing ' +
      'her actions and dialogue. Never break character, never mention you are an AI, and do not ' +
      "narrate the player's choices for them.",
    greeting:
      'Mara checks the harness one last time, then jerks her chin at the open flats. "Daylight’s burning. Stay close."',
    avatar: { monogram: 'MV', gradient: ['#ffa3b8', '#a66878'] },
    voiceTags: ['3rd-person', 'present'],
    generation: { temperature: 0.9, topP: 0.92, topK: 60, minP: 0.03, maxTokens: 2048, repeatPenalty: 1.08 }
  },
  {
    id: 'persona-notetaker',
    name: 'The Notetaker',
    role: 'Worldbuilding aide',
    brief:
      'You are a neutral, organized assistant for worldbuilding: lore, timelines and continuity. ' +
      'Stay out-of-character and answer concisely. Keep track of names, places and established facts.',
    avatar: { monogram: 'NT', gradient: ['#b8b8c0', '#4a4a52'] },
    voiceTags: ['assistant'],
    generation: { temperature: 0.4, topP: 0.85, topK: 40, minP: 0.05, maxTokens: 2048, repeatPenalty: 1.1 }
  }
]
