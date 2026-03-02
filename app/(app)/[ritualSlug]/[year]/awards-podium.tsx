'use client'

import { useState, useTransition } from 'react'
import { Trophy } from 'lucide-react'
import { setAwardWinner } from '@/lib/event-actions'

type Attendee = {
  id: string
  userId: string
  bookingStatus: string
}

type AttendeeUser = {
  id: string
  name: string | null
  image: string | null
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
}: {
  event: Event
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  awardDefs: AwardDef[]
  currentAwards: Award[]
  isSponsor: boolean
  ritualSlug: string
}) {
  const [assigning, startAssign] = useTransition()
  const [pickerDefId, setPickerDefId] = useState<string | null>(null)
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  const mvpDef = awardDefs.find((d) => d.type === 'mvp')
  const lupDef = awardDefs.find((d) => d.type === 'lup')
  const runnerUpDef = awardDefs.find((d) => d.type === 'runner_up')

  const mvpWinner = mvpDef ? currentAwards.find((a) => a.awardDefinitionId === mvpDef.id) : null
  const lupWinner = lupDef ? currentAwards.find((a) => a.awardDefinitionId === lupDef.id) : null
  const runnerUpWinner = runnerUpDef ? currentAwards.find((a) => a.awardDefinitionId === runnerUpDef.id) : null

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
    def: AwardDef | undefined
    winner: Award | null | undefined
    size?: 'normal' | 'hero'
  }) {
    if (!def) return null
    const winnerUser = winner ? userMap.get(winner.winnerId) : null

    return (
      <div className={`flex flex-col items-center gap-2 ${size === 'hero' ? 'flex-1' : 'flex-1'}`}>
        <div
          className={`flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] w-full gap-2 ${
            size === 'hero' ? 'p-4 min-h-[120px]' : 'p-3 min-h-[100px]'
          }`}
        >
          {winnerUser ? (
            <>
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
              <p className={`font-semibold text-[var(--fg)] text-center ${size === 'hero' ? 'text-sm' : 'text-xs'}`}>
                {winnerUser.name?.split(' ')[0] ?? 'Unknown'}
              </p>
            </>
          ) : isSponsor ? (
            <button
              onClick={() => setPickerDefId(def.id)}
              disabled={assigning}
              className="flex flex-col items-center gap-1 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors disabled:opacity-50"
            >
              <Trophy size={size === 'hero' ? 24 : 18} />
              <span className="text-[10px]">Assign</span>
            </button>
          ) : (
            <Trophy size={size === 'hero' ? 24 : 18} className="text-[var(--border)]" />
          )}
        </div>
        <p className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] text-center">{def.name}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Awards</p>
      <div className="flex gap-2 items-end">
        <AwardColumn def={runnerUpDef} winner={runnerUpWinner} size="normal" />
        <AwardColumn def={mvpDef} winner={mvpWinner} size="hero" />
        <AwardColumn def={lupDef} winner={lupWinner} size="normal" />
      </div>

      {/* Inline attendee picker */}
      {pickerDefId && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col gap-2">
          <p className="text-xs text-[var(--fg-muted)]">Select winner</p>
          <div className="flex flex-wrap gap-2">
            {attendees.map((a) => {
              const user = userMap.get(a.userId)
              if (!user) return null
              return (
                <button
                  key={a.userId}
                  onClick={() => handleAssign(pickerDefId, a.userId)}
                  disabled={assigning}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--fg)] hover:bg-[var(--border)] transition-colors disabled:opacity-50"
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
