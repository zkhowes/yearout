'use client'

import { useState, useTransition } from 'react'
import { Trophy } from 'lucide-react'
import { setAwardWinner } from '@/lib/event-actions'
import { getNationalityFlag } from '@/lib/flags'

type Attendee = {
  id: string
  userId: string
  bookingStatus: string
}

type AttendeeUser = {
  id: string
  name: string | null
  image: string | null
  nationality: string | null
}

type MemberOverride = {
  nationalityOverride: string | null
  customFlagSvg: string | null
}

type AwardDef = {
  id: string
  name: string
  label: string
  type: string
}

type Award = {
  id: string
  awardDefinitionId: string
  winnerId: string
}

type Event = {
  id: string
  location: string | null
  mountains: string | null
  year: number
  startDate: Date | null
  endDate: Date | null
}

export function AwardsPodium({
  event,
  attendees,
  attendeeUsers,
  awardDefs,
  currentAwards,
  isSponsor,
  ritualSlug,
  overrideMap,
}: {
  event: Event
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  awardDefs: AwardDef[]
  currentAwards: Award[]
  isSponsor: boolean
  ritualSlug: string
  overrideMap?: Map<string, MemberOverride>
}) {
  const [assigning, startAssign] = useTransition()
  const [pickerDefId, setPickerDefId] = useState<string | null>(null)
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  // Show up to 3 awards — first is hero (center), rest are normal (sides)
  const displayDefs = awardDefs.slice(0, 3)

  function handleAssign(defId: string, winnerId: string) {
    setPickerDefId(null)
    startAssign(async () => {
      await setAwardWinner(event.id, ritualSlug, event.year, defId, winnerId)
    })
  }

  function AwardColumn({
    def,
    winner,
    size = 'normal',
  }: {
    def: AwardDef
    winner: Award | null | undefined
    size?: 'normal' | 'hero'
  }) {
    const winnerUser = winner ? userMap.get(winner.winnerId) : null

    return (
      <div className="flex flex-col items-center gap-2 flex-1">
        <div
          className={`flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] w-full gap-2 ${
            size === 'hero' ? 'p-4 min-h-[120px]' : 'p-3 min-h-[100px]'
          }`}
        >
          {winnerUser ? (
            <>
              <div className="relative">
                {winnerUser.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={winnerUser.image}
                    alt={winnerUser.name ?? ''}
                    className={`rounded-full object-cover ${size === 'hero' ? 'w-14 h-14' : 'w-10 h-10'}`}
                  />
                ) : (
                  <div
                    className={`rounded-full bg-[var(--border)] flex items-center justify-center font-semibold text-[var(--fg-muted)] ${
                      size === 'hero' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-base'
                    }`}
                  >
                    {(winnerUser.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                {(() => {
                  const ov = overrideMap?.get(winner!.winnerId)
                  const flagUrl = getNationalityFlag(ov?.nationalityOverride ?? winnerUser.nationality, ov?.customFlagSvg)
                  return flagUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={flagUrl}
                      alt=""
                      className={`absolute -bottom-0.5 -right-0.5 rounded-sm object-cover border border-[var(--surface)] ${
                        size === 'hero' ? 'w-5 h-4' : 'w-4 h-3'
                      }`}
                    />
                  ) : null
                })()}
              </div>
              <p className={`font-semibold text-[var(--fg)] text-center ${size === 'hero' ? 'text-sm' : 'text-xs'}`}>
                {winnerUser.name?.split(' ')[0] ?? 'Unknown'}
              </p>
              {isSponsor && (
                <button
                  onClick={() => setPickerDefId(def.id)}
                  disabled={assigning}
                  className="flex items-center gap-1 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors disabled:opacity-50 mt-1"
                >
                  <Trophy size={14} />
                  <span className="text-xs">Reassign</span>
                </button>
              )}
            </>
          ) : isSponsor ? (
            <button
              onClick={() => setPickerDefId(def.id)}
              disabled={assigning}
              className="flex flex-col items-center gap-1 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors disabled:opacity-50"
            >
              <Trophy size={size === 'hero' ? 24 : 18} />
              <span className="text-xs">Assign</span>
            </button>
          ) : (
            <Trophy size={size === 'hero' ? 24 : 18} className="text-[var(--border)]" />
          )}
        </div>
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)] text-center">{def.name}</p>
      </div>
    )
  }

  if (displayDefs.length === 0) return null

  // Layout: 1 award = centered hero, 2 = side by side, 3 = podium (second flanks first as hero)
  const getWinner = (def: AwardDef) => currentAwards.find((a) => a.awardDefinitionId === def.id) ?? null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 items-end">
        {displayDefs.length === 1 && (
          <AwardColumn def={displayDefs[0]} winner={getWinner(displayDefs[0])} size="hero" />
        )}
        {displayDefs.length === 2 && (
          <>
            <AwardColumn def={displayDefs[0]} winner={getWinner(displayDefs[0])} size="hero" />
            <AwardColumn def={displayDefs[1]} winner={getWinner(displayDefs[1])} size="normal" />
          </>
        )}
        {displayDefs.length === 3 && (
          <>
            <AwardColumn def={displayDefs[1]} winner={getWinner(displayDefs[1])} size="normal" />
            <AwardColumn def={displayDefs[0]} winner={getWinner(displayDefs[0])} size="hero" />
            <AwardColumn def={displayDefs[2]} winner={getWinner(displayDefs[2])} size="normal" />
          </>
        )}
      </div>

      {/* Inline attendee picker */}
      {pickerDefId && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col gap-2">
          <p className="text-xs text-[var(--fg-muted)]">Select {awardDefs.find((d) => d.id === pickerDefId)?.name} winner</p>
          <div className="flex flex-wrap gap-2">
            {attendees.map((a) => {
              const user = userMap.get(a.userId)
              if (!user) return null
              return (
                <button
                  key={a.userId}
                  onClick={() => handleAssign(pickerDefId, a.userId)}
                  disabled={assigning}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg)] hover:bg-[var(--border)] transition-colors disabled:opacity-50"
                >
                  {user.name?.split(' ')[0] ?? 'Unknown'}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setPickerDefId(null)}
            className="self-start text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
