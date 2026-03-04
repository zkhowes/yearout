'use client'

import { Star, Trash2, Loader2, MapPin, User, Film, Camera } from 'lucide-react'

export type LoreEntryData = {
  id: string
  authorId: string
  type: 'memory' | 'checkin' | 'image'
  content: string | null
  mediaUrl: string | null
  location: string | null
  isHallOfFame: boolean
  day: Date | null
  createdAt: Date
  mentions: { userId: string }[]
  eventYear?: number
  eventName?: string
  subtype?: 'video_edit' | 'group_photo'
  editUrl?: string
}

type LorePostProps = {
  entry: LoreEntryData
  userMap: Map<string, { id: string; name: string | null; image: string | null }>
  currentUserId: string
  canEdit: boolean
  showEventContext?: boolean
  onToggleHOF: (entryId: string) => void
  onDelete: (entryId: string) => void
  isToggling: boolean
  isDeleting: boolean
}

function relativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function renderContentWithMentions(
  content: string,
  mentions: { userId: string }[],
  userMap: Map<string, { id: string; name: string | null; image: string | null }>
) {
  if (mentions.length === 0) return content

  // Build a set of first names that are actual mentions
  const mentionNames = new Set<string>()
  for (const m of mentions) {
    const user = userMap.get(m.userId)
    if (user?.name) {
      mentionNames.add(user.name.split(' ')[0])
    }
  }

  if (mentionNames.size === 0) return content

  // Split content on @Word patterns and highlight matches
  const pattern = new RegExp(`(@(?:${Array.from(mentionNames).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))\\b`, 'g')
  const parts = content.split(pattern)

  return parts.map((part, i) => {
    if (part.startsWith('@') && mentionNames.has(part.slice(1))) {
      return (
        <span key={i} className="text-[var(--accent)] font-medium">
          {part}
        </span>
      )
    }
    return part
  })
}

export function LorePost({
  entry,
  userMap,
  currentUserId,
  canEdit,
  showEventContext,
  onToggleHOF,
  onDelete,
  isToggling,
  isDeleting,
}: LorePostProps) {
  const author = userMap.get(entry.authorId)
  const isSynthetic = !!entry.subtype
  const canToggleHOF = !isSynthetic && (entry.authorId === currentUserId || canEdit)
  const canDeleteEntry = !isSynthetic && (entry.authorId === currentUserId || canEdit)

  return (
    <div
      className={`flex flex-col rounded-xl border bg-[var(--surface)] overflow-hidden ${
        entry.isHallOfFame ? 'border-[var(--accent)]' : 'border-[var(--border)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        {author?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.image}
            alt={author.name ?? ''}
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--border)] flex items-center justify-center shrink-0">
            <User size={14} className="text-[var(--fg-muted)]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--fg)]">
              {author?.name?.split(' ')[0] ?? 'Unknown'}
            </span>
            <span className="text-xs text-[var(--fg-muted)]">
              {relativeTime(entry.createdAt)}
            </span>
            {entry.isHallOfFame && (
              <Star size={12} className="text-[var(--accent)] fill-current" />
            )}
          </div>
          {showEventContext && entry.eventName && (
            <p className="text-[10px] text-[var(--fg-muted)] leading-tight">
              {entry.eventName} {entry.eventYear ? `'${String(entry.eventYear).slice(2)}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canToggleHOF && (
            <button
              onClick={() => onToggleHOF(entry.id)}
              disabled={isToggling}
              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                entry.isHallOfFame
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--border)] hover:text-[var(--fg-muted)]'
              }`}
              aria-label="Toggle Hall of Fame"
            >
              <Star size={14} className={entry.isHallOfFame ? 'fill-current' : ''} />
            </button>
          )}
          {canDeleteEntry && (
            <button
              onClick={() => onDelete(entry.id)}
              disabled={isDeleting}
              className="p-1.5 text-[var(--fg-muted)] hover:text-red-400 transition-colors disabled:opacity-50"
              aria-label="Delete entry"
            >
              {isDeleting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Subtype badge */}
      {entry.subtype && (
        <div className="flex items-center gap-1.5 px-4 pb-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
            entry.subtype === 'video_edit'
              ? 'bg-purple-400/20 text-purple-600 border border-purple-400/30'
              : 'bg-teal-400/20 text-teal-600 border border-teal-400/30'
          }`}>
            {entry.subtype === 'video_edit' ? <Film size={10} /> : <Camera size={10} />}
            {entry.subtype === 'video_edit' ? 'Edit' : 'Group Pic'}
          </span>
          {entry.eventName && (
            <span className="text-[10px] text-[var(--fg-muted)]">
              {entry.eventName} {entry.eventYear ? `'${String(entry.eventYear).slice(2)}` : ''}
            </span>
          )}
        </div>
      )}

      {/* Video edit embed */}
      {entry.subtype === 'video_edit' && entry.editUrl && (() => {
        const url = entry.editUrl!
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
        if (ytMatch) {
          return (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        }
        if (vimeoMatch) {
          return (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        }
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--accent)] hover:opacity-70"
          >
            <Film size={14} />
            Watch Edit
          </a>
        )
      })()}

      {/* Group photo */}
      {entry.subtype === 'group_photo' && entry.mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.mediaUrl}
          alt="Group photo"
          className="w-full max-h-[32rem] object-contain"
        />
      )}

      {/* Image */}
      {!entry.subtype && entry.type === 'image' && entry.mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.mediaUrl}
          alt="Lore photo"
          className="w-full max-h-[32rem] object-contain"
        />
      )}

      {/* Content */}
      {entry.content && (
        <div className="px-4 py-2">
          <p className="text-sm text-[var(--fg)] whitespace-pre-wrap break-words">
            {renderContentWithMentions(entry.content, entry.mentions, userMap)}
          </p>
        </div>
      )}

      {/* Footer */}
      {(entry.location || entry.day) && (
        <div className="flex items-center gap-3 px-4 pb-3 text-xs text-[var(--fg-muted)]">
          {entry.location && (
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {entry.location}
            </span>
          )}
          {entry.day && (
            <span>
              {new Date(entry.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
