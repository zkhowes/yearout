'use client'

import { useState } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'
import { HistoryGrid } from './history-grid'
import { SKALD_LOADERS } from '@/lib/skald/voice'
import type { BulkHistoryRow } from '@/lib/event-actions'
import type { ParseHistoryResponse } from '@/app/api/ritual/parse-history/route'

type Props = {
  ritualId: string
  ritualSlug: string
  ritualName: string
}

export function HistoryConverse({ ritualId, ritualSlug, ritualName }: Props) {
  const [stage, setStage] = useState<'input' | 'parsing' | 'preview'>('input')
  const [freeform, setFreeform] = useState('')
  const [parsedRows, setParsedRows] = useState<BulkHistoryRow[]>([])
  const [error, setError] = useState('')

  async function handleParse() {
    if (!freeform.trim()) return
    setStage('parsing')
    setError('')
    try {
      const res = await fetch('/api/ritual/parse-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ritualName, freeform }),
      })
      if (!res.ok) throw new Error('Parse failed')
      const data: ParseHistoryResponse = await res.json()
      setParsedRows(data.rows)
      if (data.rows.length === 0) {
        setError('The Skald could not pull any years from that. Try with more detail.')
        setStage('input')
        return
      }
      setStage('preview')
    } catch {
      setError('The Skald lost the thread. Try again.')
      setStage('input')
    }
  }

  if (stage === 'preview') {
    return (
      <div className="flex flex-col gap-6">
        <SkaldSpeaks tone="oration">
          I pulled {parsedRows.length} {parsedRows.length === 1 ? 'chapter' : 'chapters'} from your words.
          Edit anything that is wrong, then seal them.
        </SkaldSpeaks>
        <HistoryGrid ritualId={ritualId} ritualSlug={ritualSlug} initialRows={parsedRows} />
        <button
          onClick={() => { setStage('input'); setParsedRows([]) }}
          className="self-start text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        >
          ← Start over
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <SkaldSpeaks tone="oration">
        How long has this been going? Walk me through the years. Paste a list, drop a brain-dump, or talk it out — I will sort it into chapters.
      </SkaldSpeaks>

      <textarea
        value={freeform}
        onChange={(e) => setFreeform(e.target.value)}
        placeholder={`2009 South Lake Tahoe, Heavenly. The first year — someone got food poisoning.\n2010 South Lake Tahoe again, Heavenly.\n2013 Snowbird, Brighton.\n…`}
        rows={10}
        disabled={stage === 'parsing'}
        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-base text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg-muted)] resize-y disabled:opacity-50"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      {stage === 'parsing' ? (
        <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
          <Loader2 size={14} className="animate-spin" />
          {SKALD_LOADERS.readingRunes}
        </div>
      ) : (
        <button
          onClick={handleParse}
          disabled={!freeform.trim() || stage !== 'input'}
          className="flex items-center justify-center gap-2 self-start px-5 py-3 rounded-xl btn-accent text-sm font-semibold disabled:opacity-50"
        >
          Sort into chapters <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}
