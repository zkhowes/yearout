'use client'

import { useState, useRef, useTransition, useEffect, useCallback } from 'react'
import { Plus, Loader2, User } from 'lucide-react'
import { addLoreEntry } from '@/lib/event-actions'

type CrewMember = {
  id: string
  name: string | null
  image: string | null
}

type AddLoreFormProps = {
  eventId: string
  ritualSlug: string
  year: number
  crewMembers: CrewMember[]
  allowedTypes?: ('memory' | 'image' | 'checkin')[]
  onClose: () => void
}

export function AddLoreForm({
  eventId,
  ritualSlug,
  year,
  crewMembers,
  allowedTypes = ['memory', 'image', 'checkin'],
  onClose,
}: AddLoreFormProps) {
  const [type, setType] = useState<'memory' | 'image' | 'checkin'>(allowedTypes[0])
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [day, setDay] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [mentionedUserIds, setMentionedUserIds] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  // Mention autocomplete state
  const [isMentioning, setIsMentioning] = useState(false)
  const [mentionStart, setMentionStart] = useState(0)
  const [mentionQuery, setMentionQuery] = useState('')
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredCrew = isMentioning
    ? crewMembers.filter((m) =>
        m.name && m.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
      )
    : []

  const selectMention = useCallback((member: CrewMember) => {
    if (!textareaRef.current) return
    const firstName = member.name?.split(' ')[0] ?? ''
    const before = content.slice(0, mentionStart)
    const after = content.slice(textareaRef.current.selectionStart)
    const newContent = `${before}@${firstName} ${after}`
    setContent(newContent)
    setMentionedUserIds((prev) => new Set(prev).add(member.id))
    setIsMentioning(false)
    setMentionQuery('')

    // Restore cursor position after React re-renders
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = before.length + firstName.length + 2 // @ + name + space
        textareaRef.current.selectionStart = pos
        textareaRef.current.selectionEnd = pos
        textareaRef.current.focus()
      }
    })
  }, [content, mentionStart])

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedMentionIndex(0)
  }, [mentionQuery])

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value.slice(0, 200)
    const cursorPos = e.target.selectionStart
    setContent(value)

    // Check for @ trigger
    if (isMentioning) {
      // Extract query from mentionStart to cursor
      const query = value.slice(mentionStart + 1, cursorPos)
      if (query.includes(' ') || cursorPos <= mentionStart) {
        setIsMentioning(false)
        setMentionQuery('')
      } else {
        setMentionQuery(query)
      }
    } else {
      // Check if @ was just typed
      const charBefore = value[cursorPos - 1]
      const charTwoBefore = cursorPos >= 2 ? value[cursorPos - 2] : ' '
      if (charBefore === '@' && (charTwoBefore === ' ' || charTwoBefore === '\n' || cursorPos === 1)) {
        setIsMentioning(true)
        setMentionStart(cursorPos - 1)
        setMentionQuery('')
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!isMentioning || filteredCrew.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedMentionIndex((i) => Math.min(i + 1, filteredCrew.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedMentionIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      selectMention(filteredCrew[selectedMentionIndex])
    } else if (e.key === 'Escape') {
      setIsMentioning(false)
      setMentionQuery('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    startTransition(async () => {
      let mediaUrl: string | undefined

      if (type === 'image' && photoFile) {
        const formData = new FormData()
        formData.append('file', photoFile)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const { url } = await res.json()
          mediaUrl = url
        }
      }

      await addLoreEntry(
        eventId,
        ritualSlug,
        year,
        type,
        content,
        type === 'checkin' ? location.trim() || undefined : undefined,
        day ? new Date(day) : undefined,
        mediaUrl,
        mentionedUserIds.size > 0 ? Array.from(mentionedUserIds) : undefined
      )

      setContent('')
      setLocation('')
      setDay('')
      setPhotoFile(null)
      setMentionedUserIds(new Set())
      onClose()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]"
    >
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">New Entry</p>

      {/* Type toggle */}
      {allowedTypes.length > 1 && (
        <div className="flex gap-2">
          {allowedTypes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1 rounded-lg text-xs border transition-all capitalize ${
                type === t
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                  : 'border-[var(--border)] text-[var(--fg-muted)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Content textarea with @mention */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={
            type === 'memory' ? 'What happened?' :
            type === 'checkin' ? 'Where are you?' :
            'Add a caption...'
          }
          rows={3}
          maxLength={200}
          className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] resize-none"
        />
        <span className="absolute bottom-1 right-0 text-[10px] text-[var(--fg-muted)]">
          {content.length}/200
        </span>

        {/* @mention dropdown */}
        {isMentioning && filteredCrew.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-1 z-10 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg max-h-40 overflow-y-auto"
          >
            {filteredCrew.slice(0, 6).map((member, i) => (
              <button
                key={member.id}
                type="button"
                onClick={() => selectMention(member)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm transition-colors ${
                  i === selectedMentionIndex
                    ? 'bg-[var(--border)] text-[var(--fg)]'
                    : 'text-[var(--fg)] hover:bg-[var(--border)]'
                }`}
              >
                {member.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.image}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[var(--border)] flex items-center justify-center shrink-0">
                    <User size={10} className="text-[var(--fg-muted)]" />
                  </div>
                )}
                <span>{member.name?.split(' ')[0] ?? 'Unknown'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Location field (checkin only) */}
      {type === 'checkin' && (
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
        />
      )}

      {/* Image upload */}
      {type === 'image' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            {photoFile ? photoFile.name : 'Choose photo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>
      )}

      {/* Day input */}
      <input
        type="date"
        value={day}
        onChange={(e) => setDay(e.target.value)}
        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
      />

      {/* Submit / Cancel */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending || !content.trim()}
          className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Add
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
