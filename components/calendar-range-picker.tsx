'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export type DateRange = { start: Date; end: Date }

const RANGE_COLORS = [
  { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-400', dot: 'bg-amber-500' },
]

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isInRange(day: Date, range: DateRange) {
  const t = day.getTime()
  return t >= range.start.getTime() && t <= range.end.getTime()
}

function formatRange(range: DateRange) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const start = range.start.toLocaleDateString('en-US', opts)
  const end = range.end.toLocaleDateString('en-US', {
    ...opts,
    year: range.start.getFullYear() !== range.end.getFullYear() ? 'numeric' : undefined,
  })
  return `${start} – ${end}`
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startDay = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
  return days
}

export function CalendarRangePicker({
  ranges,
  onChange,
  maxRanges = 3,
}: {
  ranges: DateRange[]
  onChange: (ranges: DateRange[]) => void
  maxRanges?: number
}) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [selectingStart, setSelectingStart] = useState<Date | null>(null)

  // Show 2 months at a time
  const months = useMemo(() => {
    const m1 = { year: viewYear, month: viewMonth }
    const m2Month = viewMonth + 1 > 11 ? 0 : viewMonth + 1
    const m2Year = viewMonth + 1 > 11 ? viewYear + 1 : viewYear
    return [m1, { year: m2Year, month: m2Month }]
  }, [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  function handleDayClick(day: Date) {
    if (!selectingStart) {
      // Start selecting
      if (ranges.length >= maxRanges) return
      setSelectingStart(day)
    } else {
      // Complete the range
      const start = selectingStart < day ? selectingStart : day
      const end = selectingStart < day ? day : selectingStart
      onChange([...ranges, { start, end }])
      setSelectingStart(null)
    }
  }

  function removeRange(index: number) {
    onChange(ranges.filter((_, i) => i !== index))
  }

  function getRangeIndex(day: Date): number {
    for (let i = 0; i < ranges.length; i++) {
      if (isInRange(day, ranges[i])) return i
    }
    return -1
  }

  const isPastDay = (day: Date) => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return day.getTime() < t.getTime()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Selected ranges */}
      {ranges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ranges.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm ${RANGE_COLORS[i].border} ${RANGE_COLORS[i].bg}`}
            >
              <span className={`w-2 h-2 rounded-full ${RANGE_COLORS[i].dot}`} />
              <span className={RANGE_COLORS[i].text}>{formatRange(r)}</span>
              <button
                type="button"
                onClick={() => removeRange(i)}
                className="ml-1 p-0.5 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Instruction */}
      <p className="text-xs text-[var(--fg-muted)]">
        {selectingStart
          ? 'Tap end date to complete the range'
          : ranges.length >= maxRanges
            ? `Maximum ${maxRanges} ranges selected`
            : 'Tap a start date, then tap an end date'}
      </p>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--border)]">
          <ChevronLeft size={16} className="text-[var(--fg-muted)]" />
        </button>
        <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--border)]">
          <ChevronRight size={16} className="text-[var(--fg-muted)]" />
        </button>
      </div>

      {/* Calendar grids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {months.map(({ year, month }) => {
          const days = getMonthDays(year, month)
          const label = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

          return (
            <div key={`${year}-${month}`} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-[var(--fg)] text-center">{label}</p>
              <div className="grid grid-cols-7 gap-0.5">
                {DAY_NAMES.map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-[var(--fg-muted)] py-1">{d}</div>
                ))}
                {days.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />

                  const past = isPastDay(day)
                  const rangeIdx = getRangeIndex(day)
                  const isSelecting = selectingStart && isSameDay(day, selectingStart)
                  const inRange = rangeIdx >= 0
                  const disabled = past || (ranges.length >= maxRanges && !selectingStart)

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDayClick(day)}
                      className={`
                        aspect-square flex items-center justify-center text-xs rounded-md transition-all
                        ${past ? 'text-[var(--fg-muted)]/30 cursor-default' : ''}
                        ${isSelecting ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-bold ring-2 ring-[var(--accent)]' : ''}
                        ${inRange && !isSelecting ? `${RANGE_COLORS[rangeIdx].bg} font-semibold ${RANGE_COLORS[rangeIdx].text}` : ''}
                        ${!past && !inRange && !isSelecting ? 'text-[var(--fg)] hover:bg-[var(--border)]' : ''}
                      `}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
