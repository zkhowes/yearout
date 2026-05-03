'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, Copy, History } from 'lucide-react'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'

type Props = {
  ritualName: string
  ritualSlug: string
  inviteLink: string
}

export function DoneScreen({ ritualName, ritualSlug, inviteLink }: Props) {
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 min-h-[70vh] flex flex-col items-center justify-center text-center gap-8"
      style={{ paddingTop: 'calc(var(--header-height) + 24px)' }}
    >
      <div>
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-[var(--fg)]">{ritualName} is live.</h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">Share this link with your crew.</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <button
          onClick={copyLink}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-mono text-[var(--fg)] hover:bg-[var(--border)] transition-colors"
        >
          <span className="truncate text-left">{inviteLink}</span>
          {copied
            ? <Check size={16} className="shrink-0 text-green-500" />
            : <Copy size={16} className="shrink-0 text-[var(--fg-muted)]" />}
        </button>

        <button onClick={copyLink} className="w-full py-3 rounded-lg btn-accent text-sm font-semibold">
          {copied ? 'Copied!' : 'Copy invite link'}
        </button>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3 pt-4 border-t border-[var(--border)]">
        <SkaldSpeaks tone="brief" className="text-center">
          Has this been going for years? Let me enter the lore.
        </SkaldSpeaks>
        <button
          onClick={() => router.push(`/${ritualSlug}/history/new`)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[var(--border)] text-sm text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
        >
          <History size={14} /> Add past years
        </button>

        <button
          onClick={() => router.push(`/${ritualSlug}`)}
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        >
          Skip — go to your Ritual →
        </button>
      </div>

      <p className="text-xs text-[var(--fg-muted)]">
        You can also invite crew or add history from your ritual page anytime.
      </p>
    </motion.div>
  )
}
