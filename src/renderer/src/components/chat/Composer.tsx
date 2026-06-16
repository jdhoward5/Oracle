import { useRef, useState, useEffect } from 'react'
import { actions, useStore } from '../../store'
import { estimateTokens, formatTokens } from '@shared/context'
import { SendIcon, StopIcon } from '../../lib/icons'

export function Composer() {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const generating = useStore((s) => s.engine.state === 'generating')
  const hasModel = useStore((s) => Boolean(s.engine.modelId))

  // Auto-grow the textarea up to a cap.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [text])

  const submit = (): void => {
    if (generating || !text.trim()) return
    void actions.sendMessage(text)
    setText('')
  }

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-sibyl-border bg-sibyl-surface p-2 shadow-xl transition-colors focus-within:border-sibyl-accent/60">
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder={hasModel ? 'Message Sibyl…  (Enter to send, Shift+Enter for newline)' : 'Load a model to start chatting…'}
            className="no-drag selectable max-h-[220px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-sibyl-text placeholder:text-sibyl-muted/60 outline-none"
          />
          {generating ? (
            <button onClick={() => actions.abortGeneration()} className="btn-surface h-10 w-10 shrink-0 p-0" title="Stop">
              <StopIcon size={18} />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!text.trim()}
              className="btn-primary h-10 w-10 shrink-0 p-0"
              title="Send"
            >
              <SendIcon size={18} />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-2 text-[10.5px] text-sibyl-muted/50">
          <span>Runs entirely on your machine. Sibyl never sends your conversations anywhere.</span>
          {text.trim() && (
            <span className="font-mono text-sibyl-muted/60">· ~{formatTokens(estimateTokens(text))} tokens</span>
          )}
        </div>
      </div>
    </div>
  )
}
