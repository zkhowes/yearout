'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { Megaphone, ChevronDown, ChevronUp, Loader2, MapPin, Calendar, Users, Sparkles } from 'lucide-react'
import { castCallVote, sendTheCall } from '@/lib/event-actions'
import { computeOptimal, type OptimalResult } from '@/lib/call-optimizer'
import type { LocationCard } from '@/app/api/call/location-card/route'

type DateOption = {
  id: string
  startDate: Date
  endDate: Date
  sortOrder: number
}

type LocationOption = {
  id: string
  name: string
  aiCard: string | null // JSON string
  sortOrder: number
}

type Vote = {
  userId: string
  optionType: string
  optionId: string
}

type CrewMember = {
  userId: string
  name: string | null
  image: string | null
}

function formatDateRange(start: Date, end: Date) {
  const s = new Date(start)
  const e = new Date(end)
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  const startStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = sameMonth
    ? e.toLocaleDateString('en-US', { day: 'numeric' })
    : e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${startStr}–${endStr}`
}

export function TheCallView({
  eventId,
  ritualId,
  ritualSlug,
  year,
  callMode,
  dateOptions,
  locationOptions,
  votes,
  crew,
  currentUserId,
  isSponsor,
}: {
  eventId: string
  ritualId: string
  ritualSlug: string
  year: number
  callMode: 'best_fit' | 'all_or_none'
  dateOptions: DateOption[]
  locationOptions: LocationOption[]
  votes: Vote[]
  crew: CrewMember[]
  currentUserId: string
  isSponsor: boolean
}) {
  const [voting, startVote] = useTransition()
  const [sending, startSend] = useTransition()
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null)
  const [locationCards, setLocationCards] = useState<Record<string, LocationCard>>({})
  const [loadingCards, setLoadingCards] = useState<Set<string>>(new Set())
  const [aiName, setAiName] = useState('')
  const [nameOverride, setNameOverride] = useState('')
  const [nameLoading, setNameLoading] = useState(false)

  // Current user's votes
  const myDateVotes = new Set(votes.filter((v) => v.userId === currentUserId && v.optionType === 'date').map((v) => v.optionId))
  const myLocationVotes = new Set(votes.filter((v) => v.userId === currentUserId && v.optionType === 'location').map((v) => v.optionId))

  // Crew who have voted
  const votedUserIds = new Set(votes.map((v) => v.userId))

  // Compute optimal
  const crewIds = crew.map((c) => c.userId)
  const optimal = computeOptimal(callMode, dateOptions, locationOptions, votes, crewIds)

  // Parse cached AI cards
  useEffect(() => {
    const parsed: Record<string, LocationCard> = {}
    for (const loc of locationOptions) {
      if (loc.aiCard) {
        try { parsed[loc.id] = JSON.parse(loc.aiCard) } catch { /* skip */ }
      }
    }
    setLocationCards(parsed)
  }, [locationOptions])

  // Fetch AI card for a location
  const fetchLocationCard = useCallback(async (locId: string, locName: string) => {
    if (locationCards[locId] || loadingCards.has(locId)) return
    setLoadingCards((prev) => new Set(prev).add(locId))
    try {
      const res = await fetch('/api/call/location-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationOptionId: locId, locationName: locName, ritualId }),
      })
      if (res.ok) {
        const { card } = await res.json()
        setLocationCards((prev) => ({ ...prev, [locId]: card }))
      }
    } catch { /* ignore */ }
    setLoadingCards((prev) => { const n = new Set(prev); n.delete(locId); return n })
  }, [locationCards, loadingCards, ritualId])

  // Auto-fetch cards for locations without cached cards
  useEffect(() => {
    for (const loc of locationOptions) {
      if (!loc.aiCard && !locationCards[loc.id]) {
        fetchLocationCard(loc.id, loc.name)
      }
    }
  }, [locationOptions, locationCards, fetchLocationCard])

  // Generate AI name when optimal changes and sponsor is viewing
  useEffect(() => {
    if (!isSponsor || !optimal) return
    const winLoc = locationOptions.find((l) => l.id === optimal.locationOptionId)
    if (!winLoc) return

    setNameLoading(true)
    fetch('/api/call/generate-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: winLoc.name, year, ritualName: ritualSlug }),
    })
      .then((r) => r.json())
      .then((d) => { setAiName(d.name || `${winLoc.name} ${year}`); setNameLoading(false) })
      .catch(() => { setAiName(`${winLoc.name} ${year}`); setNameLoading(false) })
  }, [isSponsor, optimal?.locationOptionId, optimal?.dateOptionId, locationOptions, year, ritualSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleVote(optionType: 'date' | 'location', optionId: string) {
    startVote(async () => {
      await castCallVote(eventId, optionType, optionId, ritualSlug, year)
    })
  }

  function handleSendTheCall() {
    if (!optimal) return
    startSend(async () => {
      await sendTheCall(
        eventId,
        ritualSlug,
        optimal.dateOptionId,
        optimal.locationOptionId,
        nameOverride.trim() || aiName || undefined,
      )
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Mode badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium border border-[var(--accent)]/20">
          {callMode === 'best_fit' ? 'Best Fit' : 'All or None'}
        </span>
        <span className="text-xs text-[var(--fg-muted)]">
          {callMode === 'best_fit' ? 'Works for the most people' : 'Everyone must agree'}
        </span>
      </div>

      {/* Date Options */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--fg-muted)]" />
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">When works for you?</p>
        </div>
        <div className="flex flex-col gap-2">
          {dateOptions.sort((a, b) => a.sortOrder - b.sortOrder).map((d) => {
            const selected = myDateVotes.has(d.id)
            const voteCount = votes.filter((v) => v.optionType === 'date' && v.optionId === d.id).length
            const isWinner = optimal?.dateOptionId === d.id

            return (
              <button
                key={d.id}
                onClick={() => toggleVote('date', d.id)}
                disabled={voting}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] hover:border-[var(--fg-muted)]'
                } ${isWinner ? 'ring-1 ring-[var(--accent)]' : ''}`}
              >
                <span className={`text-sm font-medium ${selected ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>
                  {formatDateRange(d.startDate, d.endDate)}
                </span>
                <span className="text-xs text-[var(--fg-muted)]">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Location Options */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-[var(--fg-muted)]" />
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Where do you want to go?</p>
        </div>
        <div className="flex flex-col gap-2">
          {locationOptions.sort((a, b) => a.sortOrder - b.sortOrder).map((loc) => {
            const selected = myLocationVotes.has(loc.id)
            const voteCount = votes.filter((v) => v.optionType === 'location' && v.optionId === loc.id).length
            const isWinner = optimal?.locationOptionId === loc.id
            const card = locationCards[loc.id]
            const isExpanded = expandedLocationId === loc.id
            const isLoading = loadingCards.has(loc.id)

            return (
              <div key={loc.id} className="flex flex-col">
                <button
                  onClick={() => toggleVote('location', loc.id)}
                  disabled={voting}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-[var(--border)] hover:border-[var(--fg-muted)]'
                  } ${isWinner ? 'ring-1 ring-[var(--accent)]' : ''} ${isExpanded ? 'rounded-b-none' : ''}`}
                >
                  <span className={`text-sm font-medium ${selected ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>
                    {loc.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--fg-muted)]">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedLocationId(isExpanded ? null : loc.id)
                      }}
                      className="p-0.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </button>

                {/* AI Location Card */}
                {isExpanded && (
                  <div className="border-x border-b border-[var(--border)] rounded-b-xl p-3 bg-[var(--surface)] flex flex-col gap-3">
                    {isLoading && !card ? (
                      <div className="flex items-center gap-2 py-4 justify-center text-[var(--fg-muted)]">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs">Generating location info...</span>
                      </div>
                    ) : card ? (
                      <>
                        {card.venues?.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-1">Venues & Activities</p>
                            <ul className="flex flex-col gap-0.5">
                              {card.venues.map((v, i) => (
                                <li key={i} className="text-xs text-[var(--fg)]">{v}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {card.dining?.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-1">Dining</p>
                            <ul className="flex flex-col gap-0.5">
                              {card.dining.map((d, i) => (
                                <li key={i} className="text-xs text-[var(--fg)]">{d}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {card.facts?.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-1">Cool Facts</p>
                            <ul className="flex flex-col gap-0.5">
                              {card.facts.map((f, i) => (
                                <li key={i} className="text-xs text-[var(--fg)]">{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {card.pastEvents?.length > 0 && (
                          <div className="border-t border-[var(--border)] pt-2">
                            <p className="text-[10px] uppercase tracking-widest text-[var(--accent)] mb-1">Past Lore</p>
                            {card.pastEvents.map((pe, i) => (
                              <div key={i} className="mb-2">
                                <p className="text-xs font-semibold text-[var(--fg)]">{pe.year}</p>
                                {pe.highlights?.map((h, j) => (
                                  <p key={j} className="text-xs text-[var(--fg-muted)] italic ml-2">&ldquo;{h}&rdquo;</p>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-[var(--fg-muted)] py-2">No info available yet.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Crew Status */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[var(--fg-muted)]" />
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Crew Status</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {crew.map((c) => {
            const hasVoted = votedUserIds.has(c.userId)
            const displayName = c.name?.split(' ')[0] ?? '?'

            return (
              <div
                key={c.userId}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  hasVoted
                    ? 'border-green-500/40 bg-green-500/10'
                    : 'border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[var(--border)] flex items-center justify-center">
                    <span className="text-[10px] font-bold text-[var(--fg-muted)]">{displayName[0]}</span>
                  </div>
                )}
                <span className={`text-xs font-medium ${hasVoted ? 'text-green-500' : 'text-[var(--fg-muted)]'}`}>
                  {displayName}
                </span>
                {hasVoted && (
                  <span className="text-[10px] font-bold text-green-500 uppercase">IN</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Optimal Trip Panel */}
      <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--accent)]" />
          <p className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
            {callMode === 'best_fit' ? 'Best Fit' : 'Consensus'}
          </p>
        </div>
        {optimal ? (
          <OptimalDisplay
            optimal={optimal}
            dateOptions={dateOptions}
            locationOptions={locationOptions}
            crew={crew}
          />
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">
            {callMode === 'all_or_none'
              ? 'No unanimous option yet. Waiting for consensus...'
              : 'Waiting for votes...'}
          </p>
        )}
      </div>

      {/* Send The Call — sponsor only */}
      {isSponsor && optimal && (
        <div className="flex flex-col gap-3 p-4 rounded-xl border-2 border-[var(--accent)] bg-[var(--surface)]">
          <p className="text-sm font-semibold text-[var(--fg)]">Ready to send The Call?</p>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-[var(--fg-muted)]">Event Name</label>
            {nameLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
                <Loader2 size={12} className="animate-spin" /> Generating name...
              </div>
            ) : (
              <input
                type="text"
                value={nameOverride || aiName}
                onChange={(e) => setNameOverride(e.target.value)}
                placeholder={aiName || 'Event name'}
                className="w-full text-lg font-semibold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--accent)] outline-none pb-1 text-[var(--fg)]"
              />
            )}
          </div>

          <button
            onClick={handleSendTheCall}
            disabled={sending || nameLoading}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold disabled:opacity-50"
          >
            {sending ? (
              <><Loader2 size={16} className="animate-spin" /> Sending The Call…</>
            ) : (
              <><Megaphone size={16} /> Send The Call</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function OptimalDisplay({
  optimal,
  dateOptions,
  locationOptions,
  crew,
}: {
  optimal: OptimalResult
  dateOptions: DateOption[]
  locationOptions: LocationOption[]
  crew: CrewMember[]
}) {
  const winDate = dateOptions.find((d) => d.id === optimal.dateOptionId)
  const winLoc = locationOptions.find((l) => l.id === optimal.locationOptionId)
  const missingNames = optimal.missingUsers
    .map((uid) => crew.find((c) => c.userId === uid)?.name?.split(' ')[0] ?? '?')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {winDate && (
          <span className="text-sm font-semibold text-[var(--fg)]">
            {formatDateRange(winDate.startDate, winDate.endDate)}
          </span>
        )}
        <span className="text-[var(--fg-muted)]">+</span>
        {winLoc && (
          <span className="text-sm font-semibold text-[var(--fg)]">{winLoc.name}</span>
        )}
      </div>
      <p className="text-xs text-[var(--fg-muted)]">
        {optimal.coverage}/{optimal.totalCrew} crew can make it
        {missingNames.length > 0 && (
          <span> (missing: {missingNames.join(', ')})</span>
        )}
      </p>
    </div>
  )
}
