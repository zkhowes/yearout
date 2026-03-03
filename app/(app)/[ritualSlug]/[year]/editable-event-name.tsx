'use client'

import { useState, useTransition } from 'react'
import { updateEventDetails } from '@/lib/event-actions'
import { Pencil, Loader2, Check, X } from 'lucide-react'

export function EditableEventName({
  eventId,
  ritualSlug,
  year,
  name,
  canEdit,
}: {
  eventId: string
  ritualSlug: string
  year: number
  name: string
  canEdit: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(name)
  const [saving, startSave] = useTransition()

  if (!canEdit) {
    return <h1 className="text-3xl font-bold text-[var(--fg)]">{name}</h1>
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          className="text-3xl font-bold text-[var(--fg)] bg-transparent border-b-2 border-[var(--accent)] outline-none text-center w-full"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') { setEditing(false); setInput(name) }
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !input.trim()}
          className="p-1 text-green-500 hover:text-green-400 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        </button>
        <button
          onClick={() => { setEditing(false); setInput(name) }}
          className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  function handleSave() {
    if (!input.trim()) return
    startSave(async () => {
      await updateEventDetails(eventId, ritualSlug, year, { name: input })
      setEditing(false)
    })
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-2"
    >
      <h1 className="text-3xl font-bold text-[var(--fg)]">{name}</h1>
      <Pencil size={14} className="text-[var(--fg-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
