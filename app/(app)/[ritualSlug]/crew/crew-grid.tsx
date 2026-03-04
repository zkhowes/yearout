'use client'

import { useState, useTransition } from 'react'
import { Trophy, Shield, Star, Pencil, Check, X } from 'lucide-react'
import { getNationalityFlag } from '@/lib/flags'
import { updateCrewNickname } from '@/lib/ritual-actions'

type CrewMember = {
  userId: string
  name: string | null
  image: string | null
  nickname: string | null
  role: string
  isCoreCrewe: boolean
  nationality: string | null
  eventsAttended: number
  awards: { name: string; year: number }[]
}

const ROLE_LABELS: Record<string, string> = {
  sponsor: 'Sponsor',
  organizer: 'Organizer',
  crew_member: 'Crew Member',
}

export function CrewGrid({
  crew,
  isSponsor = false,
  ritualId,
  ritualSlug,
}: {
  crew: CrewMember[]
  isSponsor?: boolean
  ritualId?: string
  ritualSlug?: string
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingNicknameId, setEditingNicknameId] = useState<string | null>(null)
  const [nicknameValue, setNicknameValue] = useState('')
  const [saving, startSave] = useTransition()

  return (
    <div className="flex flex-col gap-2">
      {crew.map((member) => {
        const displayName = member.nickname ?? member.name?.split(' ')[0] ?? 'Unknown'
        const fullName = member.name ?? 'Unknown'
        const isExpanded = expandedId === member.userId

        return (
          <div key={member.userId} className="flex flex-col">
            <button
              onClick={() => setExpandedId(isExpanded ? null : member.userId)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isExpanded
                  ? 'border-[var(--accent)] bg-[var(--surface)]'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--fg-muted)]'
              }`}
            >
              <div className="relative shrink-0">
                {member.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.image}
                    alt={displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center">
                    <span className="text-lg font-semibold text-[var(--fg-muted)]">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {(() => {
                  const flagUrl = getNationalityFlag(member.nationality)
                  return flagUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={flagUrl}
                      alt=""
                      className="absolute -top-0.5 -right-0.5 w-5 h-4 rounded-sm object-cover border border-[var(--surface)]"
                    />
                  ) : null
                })()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-[var(--fg)] truncate">{displayName}</p>
                <p className="text-xs text-[var(--fg-muted)]">{ROLE_LABELS[member.role] ?? member.role}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {member.isCoreCrewe && (
                  <Shield size={14} className="text-[var(--accent)]" />
                )}
                {member.eventsAttended > 0 && (
                  <span className="text-xs font-bold text-[var(--fg-muted)]">
                    {member.eventsAttended}
                  </span>
                )}
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="mx-3 mb-1 px-4 py-3 border-x border-b border-[var(--accent)] rounded-b-xl bg-[var(--surface)] flex flex-col gap-2">
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--fg-muted)]">Full Name</span>
                    <span className="text-[var(--fg)]">{fullName}</span>
                  </div>
                  {(member.nickname || isSponsor) && (
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--fg-muted)]">Nickname</span>
                      {editingNicknameId === member.userId ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={nicknameValue}
                            onChange={(e) => setNicknameValue(e.target.value)}
                            className="w-28 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none text-sm text-[var(--fg)] text-right"
                            placeholder="Nickname"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                startSave(async () => {
                                  if (ritualId && ritualSlug) {
                                    await updateCrewNickname(ritualId, member.userId, nicknameValue, ritualSlug)
                                  }
                                  setEditingNicknameId(null)
                                })
                              }
                              if (e.key === 'Escape') setEditingNicknameId(null)
                            }}
                          />
                          <button
                            onClick={() => {
                              startSave(async () => {
                                if (ritualId && ritualSlug) {
                                  await updateCrewNickname(ritualId, member.userId, nicknameValue, ritualSlug)
                                }
                                setEditingNicknameId(null)
                              })
                            }}
                            disabled={saving}
                            className="p-0.5 text-green-500 hover:text-green-400"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditingNicknameId(null)}
                            className="p-0.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-[var(--fg)]">
                          {member.nickname ?? <span className="text-[var(--fg-muted)] italic text-xs">none</span>}
                          {isSponsor && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setNicknameValue(member.nickname ?? '')
                                setEditingNicknameId(member.userId)
                              }}
                              className="p-0.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                            >
                              <Pencil size={10} />
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                  {member.nationality && (
                    <div className="flex justify-between">
                      <span className="text-[var(--fg-muted)]">Nationality</span>
                      <span className="text-[var(--fg)]">{member.nationality}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--fg-muted)]">Events Attended</span>
                    <span className="text-[var(--fg)] font-semibold">{member.eventsAttended}</span>
                  </div>
                  {member.isCoreCrewe && (
                    <div className="flex items-center gap-1.5 text-[var(--accent)]">
                      <Star size={12} className="fill-current" />
                      <span className="text-xs font-semibold">Core Crew</span>
                    </div>
                  )}
                </div>

                {/* Awards */}
                {member.awards.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1 border-t border-[var(--border)]">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Awards</p>
                    {member.awards
                      .sort((a, b) => b.year - a.year)
                      .map((award, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <Trophy size={10} className="text-[var(--accent)] shrink-0" />
                          <span className="text-[var(--fg)]">{award.name}</span>
                          <span className="text-[var(--fg-muted)]">{award.year}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
