'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ArrowRight, Send } from 'lucide-react'
import { createRitual } from '@/lib/ritual-actions'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'
import { ConfirmScreen } from '@/components/new-ritual/confirm-screen'
import { DoneScreen } from '@/components/new-ritual/done-screen'
import { Rune } from '@/components/skald/rune'
import { SKALD_LOADERS } from '@/lib/skald/voice'
import type {
  SkaldMessage,
  SkaldPhase,
  SkaldConverseResponse,
} from '@/app/api/ritual/skald-converse/route'
import type { RitualInference } from '@/app/api/ritual/infer/route'

const OPENING_GREETING =
  'Tell me about your crew. What do you do together when you escape the world? Activity, place, the people. As short or long as you like.'

const PHASE_ORDER: SkaldPhase[] = ['activity', 'years', 'phrase', 'naming']

type Stage = 'chat' | 'confirm' | 'creating' | 'done'

export default function NewRitualHelpPage() {
  const [stage, setStage] = useState<Stage>('chat')
  const [messages, setMessages] = useState<SkaldMessage[]>([
    { role: 'assistant', content: OPENING_GREETING },
  ])
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [candidates, setCandidates] = useState<string[]>([])
  const [pickedName, setPickedName] = useState<string>('')

  const [inference, setInference] = useState<RitualInference | null>(null)
  const [editingTagline, setEditingTagline] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState('')
  const [createdSlug, setCreatedSlug] = useState('')
  const [error, setError] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking, candidates])

  async function sendUserTurn() {
    const trimmed = input.trim()
    if (!trimmed || thinking) return
    if (phaseIndex >= PHASE_ORDER.length) return

    const phase = PHASE_ORDER[phaseIndex]
    const nextMessages: SkaldMessage[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ]
    setMessages(nextMessages)
    setInput('')
    setThinking(true)
    setError('')

    try {
      const res = await fetch('/api/ritual/skald-converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, phase }),
      })
      if (!res.ok) throw new Error('Skald failed')
      const data: SkaldConverseResponse = await res.json()

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.assistantText },
      ])
      if (data.candidateNames && data.candidateNames.length > 0) {
        setCandidates((prev) => [...prev, ...data.candidateNames!])
      }
      setPhaseIndex((i) => i + 1)
    } catch {
      setError('The Skald lost the thread. Try again.')
    } finally {
      setThinking(false)
    }
  }

  async function rerollNames() {
    if (thinking) return
    setThinking(true)
    setError('')
    try {
      const res = await fetch('/api/ritual/skald-converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, phase: 'naming' as SkaldPhase }),
      })
      if (!res.ok) throw new Error('Skald failed')
      const data: SkaldConverseResponse = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.assistantText },
      ])
      if (data.candidateNames) {
        setCandidates((prev) => [...prev, ...data.candidateNames!])
      }
    } catch {
      setError('The Skald lost the thread. Try again.')
    } finally {
      setThinking(false)
    }
  }

  async function lockName(name: string) {
    setPickedName(name)
    setStage('confirm')
    setError('')
    // Build distilled context from the conversation: only user-authored turns.
    const distilled = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.trim())
      .filter((s) => s.length > 0)
      .join(' / ')

    try {
      const res = await fetch('/api/ritual/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, context: distilled }),
      })
      if (!res.ok) throw new Error('Inference failed')
      const data: RitualInference = await res.json()
      setInference(data)
    } catch {
      setError('Could not draft suggestions. Try again.')
      setStage('chat')
    }
  }

  async function handleCreate() {
    if (!inference || !pickedName) return
    setStage('creating')
    try {
      const { slug, inviteToken } = await createRitual(inference, pickedName.trim())
      const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
      setInviteLink(`${base}/join/${inviteToken}`)
      setCreatedSlug(slug)
      setStage('done')
    } catch {
      setStage('confirm')
      setError('Something went wrong. Try again.')
    }
  }

  if (stage === 'done') {
    return (
      <DoneScreen
        ritualName={pickedName}
        ritualSlug={createdSlug || inference?.slug || ''}
        inviteLink={inviteLink}
      />
    )
  }

  if (stage === 'confirm' || stage === 'creating') {
    return (
      <div
        className="max-w-2xl mx-auto px-4 min-h-[70vh] flex flex-col justify-center gap-10 py-8"
        style={{ paddingTop: 'calc(var(--header-height) + 24px)' }}
      >
        {!inference ? (
          <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <Loader2 size={14} className="animate-spin" />
            {SKALD_LOADERS.readingRunes}
          </div>
        ) : (
          <ConfirmScreen
            name={pickedName}
            inference={inference}
            setInference={setInference}
            editingTagline={editingTagline}
            setEditingTagline={setEditingTagline}
            logoPreview={logoPreview}
            setLogoPreview={setLogoPreview}
            creating={stage === 'creating'}
            onCreate={handleCreate}
          />
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  // Chat stage
  const showCandidates = candidates.length > 0
  const inputDisabled = thinking || phaseIndex >= PHASE_ORDER.length

  return (
    <div
      className="max-w-2xl mx-auto px-4 min-h-[70vh] flex flex-col gap-6 py-8"
      style={{ paddingTop: 'calc(var(--header-height) + 24px)' }}
    >
      <div ref={scrollRef} className="flex-1 flex flex-col gap-6 overflow-y-auto">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-1"
            >
              {m.role === 'assistant' ? (
                <SkaldSpeaks tone="oration">{m.content}</SkaldSpeaks>
              ) : (
                <div className="self-end max-w-[85%] px-4 py-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--fg)] whitespace-pre-wrap">
                  {m.content}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {thinking && (
          <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <Rune size={14} />
            <Loader2 size={12} className="animate-spin" />
            {SKALD_LOADERS.listening}
          </div>
        )}

        {showCandidates && (
          <div className="flex flex-col gap-3 mt-2">
            <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
              Pick a name — or speak your own.
            </span>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(candidates)).map((cand) => (
                <button
                  key={cand}
                  onClick={() => lockName(cand)}
                  disabled={thinking}
                  className="px-4 py-2 rounded-full border border-[var(--border)] text-sm text-[var(--fg)] hover:border-[var(--fg)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                >
                  {cand}
                </button>
              ))}
              <button
                onClick={rerollNames}
                disabled={thinking}
                className="px-4 py-2 rounded-full border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors disabled:opacity-50"
              >
                Three more
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Or type your own name…"
                className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none text-base text-[var(--fg)] placeholder-[var(--fg-muted)] py-2"
              />
              <button
                onClick={() => input.trim() && lockName(input.trim())}
                disabled={!input.trim() || thinking}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50"
              >
                Lock it <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {!showCandidates && (
        <div className="sticky bottom-0 bg-[var(--bg)] pt-2">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendUserTurn()
                }
              }}
              placeholder="Speak…"
              rows={2}
              disabled={inputDisabled}
              className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 text-base text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg-muted)] resize-none disabled:opacity-50"
            />
            <button
              onClick={sendUserTurn}
              disabled={!input.trim() || inputDisabled}
              className="p-3 rounded-2xl btn-accent disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
