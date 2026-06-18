import { Fragment, useState } from 'react'
import { CopyIcon, CheckIcon } from './icons'

// A small, safe Markdown renderer. It parses to React elements rather than
// injecting HTML, so model output can never inject markup/scripts. It supports
// the subset that matters for chat: fenced code blocks, headings, lists,
// blockquotes, bold/italic, inline code and links.

interface Block {
  type: 'code' | 'heading' | 'ul' | 'ol' | 'quote' | 'p'
  content: string
  lang?: string
  level?: number
  items?: string[]
}

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    const fence = line.match(/^```(.*)$/)
    if (fence) {
      const lang = fence[1].trim()
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i])
        i++
      }
      i++ // closing fence
      blocks.push({ type: 'code', content: buf.join('\n'), lang })
      continue
    }

    if (!line.trim()) {
      i++
      continue
    }

    // Heading
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, content: heading[2] })
      i++
      continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'quote', content: buf.join('\n') })
      continue
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', content: '', items })
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', content: '', items })
      continue
    }

    // Paragraph (consume until blank line or a block starter)
    const buf: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i]) &&
      !/^(#{1,3})\s/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      buf.push(lines[i])
      i++
    }
    blocks.push({ type: 'p', content: buf.join('\n') })
  }
  return blocks
}

// Inline formatting: **bold**, *italic*, `code`, [text](url). When `tintQuotes`
// is set (the attributed-prose transcript), spans of "…"/“…” double-quoted
// dialogue are tinted so speech reads distinct from narration.
const INLINE = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g
const INLINE_Q =
  /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|("[^"\n]+")|(“[^”\n]+”))/g

function renderInline(text: string, keyPrefix: string, tintQuotes = false): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const regex = tintQuotes ? new RegExp(INLINE_Q.source, 'g') : new RegExp(INLINE.source, 'g')
  let lastIndex = 0
  let match: RegExpExecArray | null
  let k = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={`${keyPrefix}-t${k}`}>{text.slice(lastIndex, match.index)}</Fragment>)
    }
    if (match[2] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b${k}`}>{match[2]}</strong>)
    } else if (match[3] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i${k}`}>{match[3]}</em>)
    } else if (match[4] !== undefined) {
      nodes.push(
        <code className="inline" key={`${keyPrefix}-c${k}`}>
          {match[4]}
        </code>
      )
    } else if (match[5] !== undefined && match[6] !== undefined) {
      nodes.push(
        <a key={`${keyPrefix}-a${k}`} href={match[6]} target="_blank" rel="noreferrer">
          {match[5]}
        </a>
      )
    } else if (match[7] !== undefined || match[8] !== undefined) {
      nodes.push(
        <span className="rp-quote" key={`${keyPrefix}-q${k}`}>
          {match[7] ?? match[8]}
        </span>
      )
    }
    lastIndex = regex.lastIndex
    k++
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-end`}>{text.slice(lastIndex)}</Fragment>)
  }
  return nodes
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = (): void => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-sibyl-border bg-[#0a0b12]">
      <div className="flex items-center justify-between border-b border-sibyl-border/70 bg-sibyl-surface-2/50 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-sibyl-muted">
          {lang || 'code'}
        </span>
        <button onClick={copy} className="btn-ghost h-6 px-1.5 py-0 text-[11px]">
          {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="selectable overflow-x-auto px-3.5 py-3">
        <code className="font-mono text-[13px] leading-relaxed text-sibyl-text">{code}</code>
      </pre>
    </div>
  )
}

export function Markdown({ source, tintQuotes = false }: { source: string; tintQuotes?: boolean }) {
  const blocks = parseBlocks(source)
  const tq = tintQuotes
  return (
    <div className={`prose-sibyl selectable${tq ? ' prose-rp' : ''}`}>
      {blocks.map((b, idx) => {
        const key = `b${idx}`
        switch (b.type) {
          case 'code':
            return <CodeBlock key={key} code={b.content} lang={b.lang} />
          case 'heading': {
            const Tag = (`h${b.level ?? 1}` as 'h1' | 'h2' | 'h3')
            return <Tag key={key}>{renderInline(b.content, key, tq)}</Tag>
          }
          case 'quote':
            return <blockquote key={key}>{renderInline(b.content, key, tq)}</blockquote>
          case 'ul':
            return (
              <ul key={key}>
                {b.items?.map((it, j) => <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`, tq)}</li>)}
              </ul>
            )
          case 'ol':
            return (
              <ol key={key}>
                {b.items?.map((it, j) => <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`, tq)}</li>)}
              </ol>
            )
          default:
            return <p key={key}>{renderInline(b.content, key, tq)}</p>
        }
      })}
    </div>
  )
}
