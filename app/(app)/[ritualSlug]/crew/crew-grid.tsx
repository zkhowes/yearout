'use client'

import { useState, useTransition } from 'react'
import { Trophy, Shield, Star, Pencil, Check, X, RefreshCw } from 'lucide-react'
import { getNationalityFlag, hasKnownFlag } from '@/lib/flags'
import { updateCrewNickname, updateCrewNationality, updateCrewCoreStatus } from '@/lib/ritual-actions'
import { generateFlagSvg, flagSvgToDataUri } from '@/lib/generate-flag'

type CrewMember = {
  userId: string
  name: string | null
  image: string | null
  nickname: string | null
  role: string
  isCoreCrewe: boolean
  nationality: string | null
  customFlagSvg: string | null
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
  const [editingNationalityId, setEditingNationalityId] = useState<string | null>(null)
  const [nationalityValue, setNationalityValue] = useState('')
  const [flagSeed, setFlagSeed] = useState(1)
  const [previewFlagSvg, setPreviewFlagSvg] = useState<string | null>(null)
  const [saving, startSave] = useTransition()

  function startEditNationality(member: CrewMember) {
    setNationalityValue(member.nationality ?? '')
    setEditingNationalityId(member.userId)
    // Initialize flag preview: if they already have a custom flag, show it; otherwise generate one
    if (member.customFlagSvg) {
      setPreviewFlagSvg(member.customFlagSvg)
      setFlagSeed(1)
    } else {
      const seed = 1
      setFlagSeed(seed)
      setPreviewFlagSvg(generateFlagSvg(seed))
    }
  }

  function cycleFlag() {
    const next = flagSeed + 1
    setFlagSeed(next)
    setPreviewFlagSvg(generateFlagSvg(next))
  }

  function saveNationality(member: CrewMember) {
    startSave(async () => {
      if (ritualId && ritualSlug) {
        // Only save custom flag if nationality doesn't match a known flag
        const needsCustomFlag = nationalityValue.trim() && !hasKnownFlag(nationalityValue)
        await updateCrewNationality(
          ritualId,
          member.userId,
          nationalityValue,
          needsCustomFlag ? previewFlagSvg : null,
          ritualSlug,
        )
      }
      setEditingNationalityId(null)
      setPreviewFlagSvg(null)
    })
  }

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
                  const flagUrl = getNationalityFlag(member.nationality, member.customFlagSvg)
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

                  {/* Nationality — editable by sponsor */}
                  {(member.nationality || isSponsor) && (
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--fg-muted)]">Nationality</span>
                      {editingNationalityId === member.userId ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-1">
                            <input
                              value={nationalityValue}
                              onChange={(e) => setNationalityValue(e.target.value)}
                              className="w-28 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none text-sm text-[var(--fg)] text-right"
                              placeholder="e.g. German/Swiss"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  saveNationality(member)
                                }
                                if (e.key === 'Escape') {
                                  setEditingNationalityId(null)
                                  setPreviewFlagSvg(null)
                                }
                              }}
                            />
                            <button
                              onClick={() => saveNationality(member)}
                              disabled={saving}
                              className="p-0.5 text-green-500 hover:text-green-400"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingNationalityId(null)
                                setPreviewFlagSvg(null)
                              }}
                              className="p-0.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          {/* Flag preview + cycle — only if nationality won't match a known flag */}
                          {nationalityValue.trim() && !hasKnownFlag(nationalityValue) && previewFlagSvg && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--fg-muted)]">Custom flag:</span>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={flagSvgToDataUri(previewFlagSvg)}
                                alt="Flag preview"
                                className="w-8 h-5 rounded-sm border border-[var(--border)]"
                              />
                              <button
                                onClick={cycleFlag}
                                className="p-0.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                                title="Generate different flag"
                              >
                                <RefreshCw size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-[var(--fg)]">
                          {member.nationality ?? <span className="text-[var(--fg-muted)] italic text-xs">none</span>}
                          {isSponsor && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditNationality(member)
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

                  <div className="flex justify-between">
                    <span className="text-[var(--fg-muted)]">Events Attended</span>
                    <span className="text-[var(--fg)] font-semibold">{member.eventsAttended}</span>
                  </div>

                  {/* Core Crew — toggleable by sponsor */}
                  {(member.isCoreCrewe || isSponsor) && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[var(--accent)]">
                        <Star size={12} className="fill-current" />
                        <span className="text-xs font-semibold">Core Crew</span>
                      </div>
                      {isSponsor ? (
                        <button
                          onClick={() => {
                            startSave(async () => {
                              if (ritualId && ritualSlug) {
                                await updateCrewCoreStatus(ritualId, member.userId, !member.isCoreCrewe, ritualSlug)
                              }
                            })
                          }}
                          disabled={saving}
                          className={`relative w-8 h-4 rounded-full transition-colors ${
                            member.isCoreCrewe ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                              member.isCoreCrewe ? 'left-4.5' : 'left-0.5'
                            }`}
                          />
                        </button>
                      ) : member.isCoreCrewe ? null : null}
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
