'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X, ArrowRight } from 'lucide-react'
import { bulkHistoryEnterEvents, type BulkHistoryRow, type BulkHistoryResult } from '@/lib/event-actions'

const THIS_YEAR = new Date().getFullYear()

type GridRow = {
  year: string
  location: string
  mountains: string
  memory: string
}

const blankRow = (yearOffset = 0): GridRow => ({
  year: String(THIS_YEAR - 1 - yearOffset),
  location: '',
  mountains: '',
  memory: '',
})

type Props = {
  ritualId: string
  ritualSlug: string
  initialRows?: BulkHistoryRow[]
}

export function HistoryGrid({ ritualId, ritualSlug, initialRows }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<GridRow[]>(() => {
    if (initialRows && initialRows.length > 0) {
      return initialRows.map((r) => ({
        year: String(r.year),
        location: r.location,
        mountains: r.mountains ?? '',
        memory: r.memory ?? '',
      }))
    }
    return Array.from({ length: 5 }, (_, i) => blankRow(i))
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<BulkHistoryResult | null>(null)

  function update(i: number, field: keyof GridRow, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  function addRow() {
    setRows((prev) => [...prev, blankRow(prev.length)])
  }

  // Paste handler: if user pastes TSV/CSV into the year cell, splat across grid.
  function handlePaste(rowIndex: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text')
    if (!text.includes('\n') && !text.includes('\t')) return // single value — let default handle it
    e.preventDefault()
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    const parsed: GridRow[] = lines.map((line) => {
      const cells = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ''))
      return {
        year: cells[0] ?? '',
        location: cells[1] ?? '',
        mountains: cells[2] ?? '',
        memory: cells[3] ?? '',
      }
    })
    setRows((prev) => {
      const next = [...prev]
      parsed.forEach((row, i) => {
        next[rowIndex + i] = row
      })
      return next
    })
  }

  function rowValid(r: GridRow): boolean {
    const year = Number(r.year)
    return Number.isFinite(year) && year >= 1900 && year <= THIS_YEAR && r.location.trim().length > 0
  }

  const validCount = rows.filter(rowValid).length

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const payload: BulkHistoryRow[] = rows
        .filter(rowValid)
        .map((r) => ({
          year: Number(r.year),
          location: r.location.trim(),
          mountains: r.mountains.trim() || undefined,
          memory: r.memory.trim() || undefined,
        }))
      const res = await bulkHistoryEnterEvents(ritualId, ritualSlug, payload)
      setResult(res)
      if (res.inserted > 0) {
        // Brief pause so user sees the count, then navigate
        setTimeout(() => router.push(`/${ritualSlug}`), 1200)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result && result.inserted > 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="text-3xl">⚓</div>
        <p className="text-lg font-bold text-[var(--fg)]">
          {result.inserted} {result.inserted === 1 ? 'chapter' : 'chapters'} sealed.
        </p>
        {result.skipped.length > 0 && (
          <p className="text-sm text-[var(--fg-muted)]">
            Skipped {result.skipped.length}: {result.skipped.map((s) => `${s.year} (${s.reason})`).join(', ')}
          </p>
        )}
        <p className="text-xs text-[var(--fg-muted)]">Loading your Tour…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_1.5fr_24px] gap-2 px-2 text-xs uppercase tracking-widest text-[var(--fg-muted)]">
        <span>Year</span>
        <span>Location *</span>
        <span>Mountains / Venues</span>
        <span>One memory</span>
        <span></span>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row, i) => {
          const yearNum = Number(row.year)
          const yearInvalid = row.year.length > 0 && (!Number.isFinite(yearNum) || yearNum < 1900 || yearNum > THIS_YEAR)
          return (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr_1.5fr_24px] gap-2 items-start"
            >
              <input
                type="number"
                value={row.year}
                onChange={(e) => update(i, 'year', e.target.value)}
                onPaste={(e) => handlePaste(i, e)}
                placeholder="2024"
                className={`px-2 py-2 rounded-lg bg-[var(--surface)] border ${
                  yearInvalid ? 'border-red-500' : 'border-[var(--border)]'
                } text-sm text-[var(--fg)] outline-none focus:border-[var(--fg-muted)]`}
              />
              <input
                type="text"
                value={row.location}
                onChange={(e) => update(i, 'location', e.target.value)}
                placeholder="Whistler, BC"
                className={`px-2 py-2 rounded-lg bg-[var(--surface)] border ${
                  row.year.length > 0 && row.location.trim().length === 0
                    ? 'border-red-500'
                    : 'border-[var(--border)]'
                } text-sm text-[var(--fg)] outline-none focus:border-[var(--fg-muted)]`}
              />
              <input
                type="text"
                value={row.mountains}
                onChange={(e) => update(i, 'mountains', e.target.value)}
                placeholder="Blackcomb, Whistler"
                className="px-2 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--fg)] outline-none focus:border-[var(--fg-muted)]"
              />
              <textarea
                value={row.memory}
                onChange={(e) => update(i, 'memory', e.target.value)}
                placeholder="That time we…"
                rows={1}
                className="px-2 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--fg)] outline-none focus:border-[var(--fg-muted)] resize-y min-h-[40px]"
              />
              <button
                onClick={() => removeRow(i)}
                className="p-2 text-[var(--fg-muted)] hover:text-red-400 transition-colors self-center"
                aria-label="Remove row"
                title="Remove row"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>

      <button
        onClick={addRow}
        className="flex items-center gap-1.5 self-start px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
      >
        <Plus size={14} /> Add row
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {result && result.inserted === 0 && (
        <p className="text-sm text-[var(--fg-muted)]">
          Nothing inserted. Skipped: {result.skipped.map((s) => `${s.year} (${s.reason})`).join(', ')}
        </p>
      )}

      <div className="flex items-center gap-3 mt-4">
        <span className="text-xs text-[var(--fg-muted)]">
          {validCount} {validCount === 1 ? 'row' : 'rows'} ready
        </span>
        <button
          onClick={handleSubmit}
          disabled={submitting || validCount === 0}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl btn-accent text-sm font-semibold disabled:opacity-50 ml-auto"
        >
          {submitting ? (
            <><Loader2 size={14} className="animate-spin" /> Sealing chapters…</>
          ) : (
            <>Seal {validCount} {validCount === 1 ? 'chapter' : 'chapters'} <ArrowRight size={14} /></>
          )}
        </button>
      </div>
    </div>
  )
}
