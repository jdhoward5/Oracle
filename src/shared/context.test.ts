import { describe, it, expect } from 'vitest'
import { contextLevel, contextPercent, formatTokens, levelColor } from './context'

describe('contextLevel', () => {
  it('classifies against thresholds', () => {
    expect(contextLevel(0.1, 0.7, 0.85)).toBe('ok')
    expect(contextLevel(0.7, 0.7, 0.85)).toBe('warn')
    expect(contextLevel(0.8, 0.7, 0.85)).toBe('warn')
    expect(contextLevel(0.85, 0.7, 0.85)).toBe('critical')
    expect(contextLevel(1.2, 0.7, 0.85)).toBe('critical')
  })
  it('is safe for non-finite input', () => {
    expect(contextLevel(NaN, 0.7, 0.85)).toBe('ok')
  })
})

describe('formatTokens', () => {
  it('handles zero and negatives', () => {
    expect(formatTokens(0)).toBe('0')
    expect(formatTokens(-10)).toBe('0')
  })
  it('formats below and above 1K', () => {
    expect(formatTokens(950)).toBe('950')
    expect(formatTokens(1000)).toBe('1.0K')
    expect(formatTokens(8400)).toBe('8.4K')
    expect(formatTokens(32768)).toBe('33K')
  })
})

describe('contextPercent', () => {
  it('rounds and clamps', () => {
    expect(contextPercent(0)).toBe(0)
    expect(contextPercent(0.5)).toBe(50)
    expect(contextPercent(0.754)).toBe(75)
    expect(contextPercent(1.5)).toBe(100)
    expect(contextPercent(NaN)).toBe(0)
  })
})

describe('levelColor', () => {
  it('returns a class per level', () => {
    expect(levelColor('ok').bar).toContain('accent')
    expect(levelColor('warn').bar).toContain('amber')
    expect(levelColor('critical').bar).toContain('rose')
  })
})
