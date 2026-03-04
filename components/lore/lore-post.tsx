'use client'

import { Star, Trash2, Loader2, MapPin, User, Film, Camera, Play, MessageSquare, Image as ImageIcon, Navigation } from 'lucide-react'

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

      {/* Type badge */}
      <div className="flex items-center gap-1.5 px-4 pb-1">
        {entry.subtype === 'video_edit' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-purple-400/20 text-purple-600 border border-purple-400/30">
            <Film size={10} /> Edit
          </span>
        ) : entry.subtype === 'group_photo' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-teal-400/20 text-teal-600 border border-teal-400/30">
            <Camera size={10} /> Group Pic
          </span>
        ) : entry.type === 'memory' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-blue-400/20 text-blue-500 border border-blue-400/30">
            <MessageSquare size={10} /> Memory
          </span>
        ) : entry.type === 'image' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-400/20 text-amber-500 border border-amber-400/30">
            <ImageIcon size={10} /> Image
          </span>
        ) : entry.type === 'checkin' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-green-400/20 text-green-500 border border-green-400/30">
            <Navigation size={10} /> Checkin
          </span>
        ) : null}
      </div>

      {/* Video edit - thumbnail with play link */}
      {entry.subtype === 'video_edit' && entry.editUrl && (
        <a
          href={entry.editUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block group"
        >
          {entry.mediaUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.mediaUrl}
                alt="Video edit thumbnail"
                className="w-full max-h-[32rem] object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
                  <Play size={24} className="text-white ml-1" fill="white" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--accent)] hover:opacity-70">
              <Film size={14} />
              Watch Edit
            </div>
          )}
        </a>
      )}

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
        <div className="flex items-center gap-3 px-4 pt-2 pb-3 text-xs text-[var(--fg-muted)]">
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
