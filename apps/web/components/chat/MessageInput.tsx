'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Mic, MicOff, Paperclip, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (message: string) => void
  onFileUpload: (file: File) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export const MessageInput = forwardRef<{ focus: () => void }, MessageInputProps>(
  function MessageInput({ onSend, onFileUpload, disabled, placeholder }, ref) {
    const [value, setValue] = useState('')
    const [pendingFile, setPendingFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [hasSpeechSupport, setHasSpeechSupport] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const recognitionRef = useRef<any>(null)

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }))

    useEffect(() => {
      setHasSpeechSupport(
        typeof window !== 'undefined' &&
          ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
      )
    }, [])

    function handleSend() {
      const trimmed = value.trim()
      if (!trimmed || disabled) return
      onSend(trimmed)
      setValue('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
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
      try {
        await onFileUpload(file)
      } finally {
        setUploading(false)
      }
      e.target.value = ''
    }

    function toggleRecording() {
      if (isRecording) {
        recognitionRef.current?.stop()
        setIsRecording(false)
        return
      }

      const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
      if (!SR) return

      const recognition = new SR()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript
        setValue((prev) => (prev ? `${prev} ${transcript}` : transcript))
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
          }
        }, 0)
      }

      recognition.onend = () => setIsRecording(false)
      recognition.onerror = () => setIsRecording(false)

      recognitionRef.current = recognition
      recognition.start()
      setIsRecording(true)
    }

    return (
      <div className="border-t border-slate-100 bg-white px-4 py-4">
        {pendingFile && (
          <div className="mb-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 ring-1 ring-inset ring-indigo-100">
              📎 {pendingFile.name}
              {uploading && <span className="ml-1 opacity-60">uploading…</span>}
            </span>
            {!uploading && (
              <button
                onClick={() => setPendingFile(null)}
                className="rounded-full p-0.5 text-slate-400 transition-colors hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <div
          className={cn(
            'flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 transition-all duration-200',
            'focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100',
            disabled && 'opacity-50',
          )}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            title="Attach pitch deck (PDF)"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 disabled:cursor-not-allowed"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={handleFileChange}
          />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder ?? 'Type your answer…'}
            rows={1}
            className="flex-1 resize-none bg-transparent py-1 text-sm text-slate-800 placeholder-slate-400 outline-none"
            style={{ maxHeight: '160px' }}
          />

          {hasSpeechSupport && (
            <button
              onClick={toggleRecording}
              disabled={disabled}
              title={isRecording ? 'Stop recording' : 'Speak your answer'}
              className={cn(
                'shrink-0 rounded-lg p-1.5 transition-all disabled:cursor-not-allowed',
                isRecording
                  ? 'animate-pulse bg-red-100 text-red-500'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600',
              )}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            aria-label="Send message"
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
              value.trim() && !disabled
                ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                : 'cursor-not-allowed bg-slate-100 text-slate-300',
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mt-2 text-center text-xs text-slate-400">
          Enter to send · Shift+Enter for new line
          {hasSpeechSupport ? ' · tap mic to speak' : ''}
        </p>
      </div>
    )
  },
)
