'use client'

import { useState, useTransition, useRef } from 'react'
import { Check, Loader2, Upload, Sparkles, Trash2, Plus, ChevronDown } from 'lucide-react'
import { updateRitual, createAwardDefinition, updateAwardDefinition, deleteAwardDefinition, toggleAwardEventLink } from '@/lib/ritual-actions'

const ACTIVITY_LABELS: Record<string, string> = {
  ski: '⛷️  Ski / Snow',
  golf: '⛳  Golf',
  mountain_biking: '🚵  Mountain Biking',
  fishing: '🎣  Fishing',
  backpacking: '🎒  Backpacking',
  family: '🏡  Family',
  girls_trip: '✨  Girls Trip',
  other: '🧭  Other',
}

const THEME_CONFIG: Record<string, { label: string; bg: string; text: string; desc: string }> = {
  circuit: { label: 'The Circuit', bg: '#0a0a0a', text: '#c9a84c', desc: 'Dark. Grungy. Earned.' },
  club:    { label: 'The Club',    bg: '#1a2744', text: '#faf7f0', desc: 'Refined. Classic.' },
  trail:   { label: 'The Trail',   bg: '#2d5a3d', text: '#f7f4ee', desc: 'Earthy. Rugged.' },
  getaway: { label: 'The Getaway', bg: '#f06c2a', text: '#ffffff', desc: 'Warm. Joyful.' },
}

type Ritual = {
  id: string
  name: string
  tagline: string | null
  theme: string
  activityType: string
  foundingYear: string | null
  bylaws: string | null
  description: string | null
  logoUrl: string | null
  inviteToken: string
  slug: string
}

type AwardDef = {
  id: string
  name: string
  label: string
  type: string
  hasWinners: boolean
}

type RitualEvent = {
  id: string
  name: string
  year: number
  status: string
}

type AwardLink = {
  awardDefinitionId: string
  eventId: string
}

export function SettingsForm({
  ritual,
  appUrl,
  awardDefs,
  ritualEvents,
  awardLinks,
}: {
  ritual: Ritual
  appUrl: string
  awardDefs: AwardDef[]
  ritualEvents: RitualEvent[]
  awardLinks: AwardLink[]
}) {
  const [name, setName] = useState(ritual.name)
  const [tagline, setTagline] = useState(ritual.tagline ?? '')
  const [theme, setTheme] = useState(ritual.theme)
  const [activityType, setActivityType] = useState(ritual.activityType)
  const [foundingYear, setFoundingYear] = useState(ritual.foundingYear ?? '')
  const [bylaws, setBylaws] = useState(ritual.bylaws ?? '')
  const [description, setDescription] = useState(ritual.description ?? '')
  const [rewriting, setRewriting] = useState(false)
  const [logoUrl, setLogoUrl] = useState(ritual.logoUrl ?? '')
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const inviteLink = `${appUrl}/join/${ritual.inviteToken}`
  const [copied, setCopied] = useState(false)

  async function handleRewrite() {
    if (!description.trim()) return
    setRewriting(true)
    try {
      const res = await fetch('/api/ritual/rewrite-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, ritualName: name, activityType }),
      })
      if (res.ok) {
        const { rewritten } = await res.json()
        setDescription(rewritten)
      }
    } finally {
      setRewriting(false)
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const { url } = await res.json()
      setLogoUrl(url)
    } finally {
      setLogoUploading(false)
    }
  }

  function save() {
    startTransition(async () => {
      await updateRitual(ritual.id, { name, tagline, theme: theme as 'circuit' | 'club' | 'trail' | 'getaway', activityType, foundingYear, bylaws, description, logoUrl: logoUrl || undefined })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-10">

      {/* ── Identity ── */}
      <section className="flex flex-col gap-5">
        <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Identity</h2>

        <div className="flex flex-col items-center gap-3">
          <label className="text-xs text-[var(--fg-muted)]">Logo</label>
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full border-2 border-dashed border-[var(--border)] hover:border-[var(--fg)] transition-colors overflow-hidden flex items-center justify-center"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Ritual logo" className="w-full h-full object-cover" />
            ) : (
              <Upload size={20} className="text-[var(--fg-muted)]" />
            )}
            {logoUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <Loader2 size={20} className="animate-spin text-white" />
              </div>
            )}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--fg-muted)]">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-[var(--fg)] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--fg-muted)]">Tagline</label>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="3–6 word punchy phrase"
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--fg-muted)]">Founding Year</label>
          <input
            value={foundingYear}
            onChange={(e) => setFoundingYear(e.target.value)}
            placeholder="e.g. 2009"
            className="w-32 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--fg-muted)]">Bylaws / Motto</label>
          <textarea
            value={bylaws}
            onChange={(e) => setBylaws(e.target.value)}
            rows={3}
            placeholder="The rules, the creed, the legend."
            className="w-full bg-transparent border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:border-[var(--fg)] outline-none resize-none transition-colors"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--fg-muted)]">Description</label>
            <button
              type="button"
              onClick={handleRewrite}
              disabled={rewriting || !description.trim()}
              className="p-1 text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-40"
              title="AI rewrite"
            >
              {rewriting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Tell the story of this ritual. What makes it legendary?"
            className="w-full bg-transparent border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:border-[var(--fg)] outline-none resize-none transition-colors"
          />
        </div>
      </section>

      {/* ── Activity ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Activity</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActivityType(key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activityType === key
                  ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
                  : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Theme ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Theme</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(THEME_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              style={{ backgroundColor: cfg.bg, borderColor: cfg.bg }}
              className={`flex flex-col gap-1 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                theme === key
                  ? 'ring-2 ring-offset-2 ring-[var(--fg)] scale-[1.03]'
                  : 'opacity-60 hover:opacity-80'
              }`}
            >
              <span className="text-sm font-semibold" style={{ color: cfg.text }}>{cfg.label}</span>
              <span className="text-xs leading-tight" style={{ color: cfg.text, opacity: 0.65 }}>{cfg.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Awards ── */}
      <AwardsSection
        ritualId={ritual.id}
        ritualSlug={ritual.slug}
        awardDefs={awardDefs}
        ritualEvents={ritualEvents}
        awardLinks={awardLinks}
      />

      {/* ── Invite link ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Invite Link</h2>
        <button
          onClick={copyInvite}
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-mono text-[var(--fg)] hover:bg-[var(--border)] transition-colors"
        >
          <span className="truncate text-left text-xs">{inviteLink}</span>
          {copied
            ? <Check size={14} className="shrink-0 text-green-500" />
            : <span className="shrink-0 text-xs text-[var(--fg-muted)]">Copy</span>}
        </button>
        <p className="text-xs text-[var(--fg-muted)]">Anyone with this link can join as a crew member.</p>
      </section>

      {/* ── Save ── */}
      <button
        onClick={save}
        disabled={pending}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold disabled:opacity-50"
      >
        {pending ? (
          <><Loader2 size={16} className="animate-spin" /> Saving...</>
        ) : saved ? (
          <><Check size={16} /> Saved</>
        ) : (
          'Save Changes'
        )}
      </button>
    </div>
  )
}

function AwardsSection({
  ritualId,
  ritualSlug,
  awardDefs,
  ritualEvents,
  awardLinks,
}: {
  ritualId: string
  ritualSlug: string
  awardDefs: AwardDef[]
  ritualEvents: RitualEvent[]
  awardLinks: AwardLink[]
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newEventIds, setNewEventIds] = useState<string[]>(ritualEvents.map((e) => e.id))
  const [addPending, startAddTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    if (!newName.trim() || !newLabel.trim()) return
    setError(null)
    startAddTransition(async () => {
      try {
        await createAwardDefinition(ritualId, newName, newLabel, newEventIds, ritualSlug)
        setNewName('')
        setNewLabel('')
        setNewEventIds(ritualEvents.map((e) => e.id))
        setShowAddForm(false)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to create award')
      }
    })
  }

  const sortedEvents = [...ritualEvents].sort((a, b) => b.year - a.year)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Awards</h2>

      {awardDefs.length === 0 && !showAddForm && (
        <p className="text-sm text-[var(--fg-muted)]">No awards defined yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {awardDefs.map((def) => (
          <AwardRow
            key={def.id}
            def={def}
            ritualSlug={ritualSlug}
            events={sortedEvents}
            linkedEventIds={awardLinks.filter((l) => l.awardDefinitionId === def.id).map((l) => l.eventId)}
            allAwardLinks={awardLinks}
          />
        ))}
      </div>

      {showAddForm ? (
        <div className="flex flex-col gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-[var(--fg-muted)]">Award Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Best Wipeout"
              className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-[var(--fg-muted)]">Label</label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Most Spectacular Fall"
              className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors"
            />
          </div>
          <EventMultiSelect
            events={sortedEvents}
            selectedIds={newEventIds}
            onChange={setNewEventIds}
            awardLinks={awardLinks}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={addPending || !newName.trim() || !newLabel.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-accent text-sm font-medium disabled:opacity-50"
            >
              {addPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add Award
            </button>
            <button
              onClick={() => { setShowAddForm(false); setError(null) }}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors w-fit"
        >
          <Plus size={14} />
          Add Award
        </button>
      )}
    </section>
  )
}

function AwardRow({
  def,
  ritualSlug,
  events,
  linkedEventIds,
  allAwardLinks,
}: {
  def: AwardDef
  ritualSlug: string
  events: RitualEvent[]
  linkedEventIds: string[]
  allAwardLinks: AwardLink[]
}) {
  const [editName, setEditName] = useState(def.name)
  const [editLabel, setEditLabel] = useState(def.label)
  const [showEvents, setShowEvents] = useState(false)
  const [updatePending, startUpdateTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const nameChanged = editName !== def.name
  const labelChanged = editLabel !== def.label

  function handleSave() {
    setError(null)
    startUpdateTransition(async () => {
      try {
        await updateAwardDefinition(def.id, {
          ...(nameChanged && { name: editName }),
          ...(labelChanged && { label: editLabel }),
        }, ritualSlug)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to update')
      }
    })
  }

  function handleDelete() {
    setError(null)
    startDeleteTransition(async () => {
      try {
        await deleteAwardDefinition(def.id, ritualSlug)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to delete')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--border)]">
      <div className="flex items-start gap-2">
        <div className="flex-1 flex flex-col gap-2">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full bg-transparent border-b border-transparent focus:border-[var(--border)] outline-none text-sm font-semibold text-[var(--fg)] transition-colors"
          />
          <input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="w-full bg-transparent border-b border-transparent focus:border-[var(--border)] outline-none text-xs text-[var(--fg-muted)] transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {(nameChanged || labelChanged) && (
            <button
              onClick={handleSave}
              disabled={updatePending}
              className="p-1.5 rounded text-[var(--fg-muted)] hover:text-green-500 transition-colors"
              title="Save changes"
            >
              {updatePending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deletePending || def.hasWinners}
            className="p-1.5 rounded text-[var(--fg-muted)] hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:text-[var(--fg-muted)]"
            title={def.hasWinners ? 'Cannot delete: has finalized winners' : 'Delete award'}
          >
            {deletePending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">{def.type}</span>
        <button
          onClick={() => setShowEvents(!showEvents)}
          className="flex items-center gap-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        >
          {linkedEventIds.length}/{events.length} events
          <ChevronDown size={12} className={`transition-transform ${showEvents ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showEvents && (
        <EventLinkToggles
          awardDefId={def.id}
          ritualSlug={ritualSlug}
          events={events}
          linkedEventIds={linkedEventIds}
          allAwardLinks={allAwardLinks}
        />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function EventLinkToggles({
  awardDefId,
  ritualSlug,
  events,
  linkedEventIds,
  allAwardLinks,
}: {
  awardDefId: string
  ritualSlug: string
  events: RitualEvent[]
  linkedEventIds: string[]
  allAwardLinks: AwardLink[]
}) {
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Count awards per event (across all award defs)
  const countByEvent = new Map<string, number>()
  for (const link of allAwardLinks) {
    countByEvent.set(link.eventId, (countByEvent.get(link.eventId) ?? 0) + 1)
  }

  async function handleToggle(eventId: string, currentlyLinked: boolean) {
    setToggling(eventId)
    setError(null)
    try {
      await toggleAwardEventLink(awardDefId, eventId, !currentlyLinked, ritualSlug)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to toggle')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="flex flex-col gap-1 pl-1">
      {events.map((evt) => {
        const isLinked = linkedEventIds.includes(evt.id)
        const isToggling = toggling === evt.id
        const eventCount = countByEvent.get(evt.id) ?? 0
        const atLimit = eventCount >= 3 && !isLinked
        return (
          <label key={evt.id} className={`flex items-center gap-2 text-xs py-0.5 ${atLimit ? 'text-[var(--fg-muted)] opacity-50' : 'text-[var(--fg)] cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={isLinked}
              disabled={isToggling || atLimit}
              onChange={() => handleToggle(evt.id, isLinked)}
              className="accent-[var(--accent)]"
            />
            {isToggling && <Loader2 size={10} className="animate-spin" />}
            <span>{evt.name} ({evt.year})</span>
            <span className="text-[10px] text-[var(--fg-muted)]">{eventCount}/3</span>
          </label>
        )
      })}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function EventMultiSelect({
  events,
  selectedIds,
  onChange,
  awardLinks,
}: {
  events: RitualEvent[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  awardLinks: AwardLink[]
}) {
  const countByEvent = new Map<string, number>()
  for (const link of awardLinks) {
    countByEvent.set(link.eventId, (countByEvent.get(link.eventId) ?? 0) + 1)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-[var(--fg-muted)]">Link to Events (max 3 awards per event)</label>
      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
        {events.map((evt) => {
          const eventCount = countByEvent.get(evt.id) ?? 0
          const atLimit = eventCount >= 3 && !selectedIds.includes(evt.id)
          return (
            <label key={evt.id} className={`flex items-center gap-2 text-xs py-0.5 ${atLimit ? 'text-[var(--fg-muted)] opacity-50' : 'text-[var(--fg)] cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={selectedIds.includes(evt.id)}
                disabled={atLimit}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selectedIds, evt.id])
                  } else {
                    onChange(selectedIds.filter((id) => id !== evt.id))
                  }
                }}
                className="accent-[var(--accent)]"
              />
              <span>{evt.name} ({evt.year})</span>
              <span className="text-[10px] text-[var(--fg-muted)]">{eventCount}/3</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
