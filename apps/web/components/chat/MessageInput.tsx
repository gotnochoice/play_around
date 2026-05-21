'use client'

import { useRef, useState } from 'react'
import { Send, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (message: string) => void
  onFileUpload: (file: File) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({ onSend, onFileUpload, disabled, placeholder }: MessageInputProps) {
  const [value, setValue] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setUploading(true)
    try { await onFileUpload(file) } finally { setUploading(false) }
    e.target.value = ''
  }

  return (
    <div className="border-t border-purple-100 bg-white px-4 py-4">
      {pendingFile && (
        <div className="mb-2 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-medium text-brand-blue">
            📎 {pendingFile.name}
            {uploading && <span className="ml-1 opacity-60">uploading…</span>}
          </span>
          {!uploading && (
            <button onClick={() => setPendingFile(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
      <div className={cn('flex items-end gap-3 rounded-2xl border border-purple-200 bg-brand-light/40 px-4 py-3 transition-all', 'focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10', disabled && 'opacity-60')}>
        <button onClick={() => fileInputRef.current?.click()} disabled={disabled || uploading} className="shrink-0 text-purple-400 hover:text-brand-blue transition-colors disabled:cursor-not-allowed" title="Attach pitch deck (PDF)">
          <Paperclip className="h-4 w-4" />
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileChange} />
        <textarea ref={textareaRef} value={value} onChange={handleChange} onKeyDown={handleKeyDown} disabled={disabled} placeholder={placeholder ?? 'Type your answer…'} rows={1} className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none" style={{ maxHeight: '160px' }} />
        <button onClick={handleSend} disabled={!value.trim() || disabled} className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all', value.trim() && !disabled ? 'bg-brand-navy text-white hover:bg-brand-blue' : 'bg-purple-100 text-purple-300 cursor-not-allowed')} aria-label="Send message">
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">Enter to send · Shift+Enter for new line · 📎 attach your pitch deck</p>
    </div>
  )
}
