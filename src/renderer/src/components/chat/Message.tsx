import { memo, useState } from 'react'
import type { ChatMessage } from '@shared/types'
import { Markdown } from '../../lib/markdown'
import { SparkIcon, CopyIcon, CheckIcon } from '../../lib/icons'

interface Props {
  message: ChatMessage
  streaming: boolean
}

function MessageImpl({ message, streaming }: Props) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const copy = (): void => {
    void navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (isUser) {
    return (
      <div className="group flex justify-end animate-fade-in">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-oracle-accent/90 to-oracle-accent-2/90 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-lg shadow-oracle-accent/10">
          <p className="selectable whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex gap-3 animate-fade-in">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-oracle-accent to-oracle-accent-2 text-white shadow-md shadow-oracle-accent/30">
        <SparkIcon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        {message.content ? (
          <div className={streaming ? 'caret-wrap' : ''}>
            <Markdown source={message.content} />
            {streaming && <span className="caret" />}
          </div>
        ) : (
          <div className="flex items-center gap-1 py-2">
            <span className="h-2 w-2 animate-pulse-glow rounded-full bg-oracle-accent" />
            <span className="h-2 w-2 animate-pulse-glow rounded-full bg-oracle-accent [animation-delay:0.2s]" />
            <span className="h-2 w-2 animate-pulse-glow rounded-full bg-oracle-accent [animation-delay:0.4s]" />
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
          {message.content && (
            <button onClick={copy} className="flex items-center gap-1 text-[11px] text-oracle-muted hover:text-oracle-text">
              {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          {message.stats && (
            <span className="text-[11px] text-oracle-muted/70">
              {message.stats.completionTokens} tokens · {message.stats.tokensPerSecond.toFixed(1)} tok/s
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export const Message = memo(MessageImpl)
