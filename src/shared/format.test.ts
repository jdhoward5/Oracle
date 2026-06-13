import { describe, it, expect } from 'vitest'
import {
  formatBytes,
  formatEta,
  formatSpeed,
  isMultipartGGUF,
  modelIdFor,
  parseParamLabel,
  parseQuant,
  quantRank,
  truncate
} from './format'

describe('formatBytes', () => {
  it('handles zero and negatives', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(-5)).toBe('0 B')
  })
  it('formats across units', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(3.4 * 1024 ** 3)).toBe('3.4 GB')
  })
})

describe('formatSpeed', () => {
  it('returns dash for non-positive', () => {
    expect(formatSpeed(0)).toBe('—')
  })
  it('appends /s', () => {
    expect(formatSpeed(1024)).toBe('1.0 KB/s')
  })
})

describe('formatEta', () => {
  it('handles null and negatives', () => {
    expect(formatEta(null)).toBe('—')
    expect(formatEta(-1)).toBe('—')
  })
  it('formats seconds, minutes, hours', () => {
    expect(formatEta(45)).toBe('45s')
    expect(formatEta(90)).toBe('1m 30s')
    expect(formatEta(3700)).toBe('1h 1m')
  })
})

describe('parseQuant', () => {
  it('parses common quant labels', () => {
    expect(parseQuant('Llama-3.2-3B-Instruct-Q4_K_M.gguf')).toBe('Q4_K_M')
    expect(parseQuant('model-Q8_0.gguf')).toBe('Q8_0')
    expect(parseQuant('model-IQ3_XXS.gguf')).toBe('IQ3_XXS')
    expect(parseQuant('model-f16.gguf')).toBe('F16')
  })
  it('returns undefined when absent', () => {
    expect(parseQuant('model.gguf')).toBeUndefined()
  })
})

describe('parseParamLabel', () => {
  it('parses parameter sizes', () => {
    expect(parseParamLabel('Llama-3.2-3B-Instruct')).toBe('3B')
    expect(parseParamLabel('Qwen2.5-0.5B')).toBe('0.5B')
    expect(parseParamLabel('something-7b-chat')).toBe('7B')
  })
})

describe('isMultipartGGUF', () => {
  it('detects shard naming', () => {
    expect(isMultipartGGUF('model-00001-of-00003.gguf')).toBe(true)
    expect(isMultipartGGUF('model-Q4_K_M.gguf')).toBe(false)
  })
})

describe('modelIdFor', () => {
  it('produces a filesystem-safe id', () => {
    expect(modelIdFor('bartowski/Foo', 'Foo-Q4_K_M.gguf')).toBe('bartowski/Foo/Foo-Q4_K_M.gguf')
    expect(modelIdFor('a b/c', 'x y.gguf')).toBe('a_b/c/x_y.gguf')
  })
})

describe('quantRank', () => {
  it('orders quants by quality', () => {
    expect(quantRank('F16')).toBeGreaterThan(quantRank('Q8_0'))
    expect(quantRank('Q8_0')).toBeGreaterThan(quantRank('Q4_K_M'))
    expect(quantRank('Q4_K_M')).toBeGreaterThan(quantRank('Q2_K'))
    expect(quantRank(undefined)).toBe(0)
  })
})

describe('truncate', () => {
  it('keeps short strings', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })
  it('truncates with ellipsis', () => {
    expect(truncate('hello world', 6)).toBe('hello…')
  })
})
