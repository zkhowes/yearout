'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function RitualIdentity({
  slug,
  name,
  tagline,
  logoUrl,
  isSponsor,
}: {
  slug: string
  name: string
  tagline: string | null
  logoUrl: string | null
  isSponsor: boolean
}) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const isEventPage = segments.length === 2 && /^\d{4}$/.test(segments[1])
  if (isEventPage) return null

  return (
    <div className="relative flex flex-col items-center text-center pt-6 gap-2">
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="w-24 h-24 rounded-full object-cover mb-1" />
      ) : (
        <div className="w-24 h-24 rounded-full bg-[var(--accent)] opacity-20 mb-1" />
      )}
      <h1 className="text-3xl font-bold text-[var(--fg)]">{name}</h1>
      {tagline && (
        <p className="text-sm text-[var(--fg-muted)] italic">{tagline}</p>
      )}
      {isSponsor && (
        <Link
          href={`/${slug}/settings`}
          className="absolute top-4 right-0 p-2 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          aria-label="Ritual settings"
        >
          <Settings size={18} />
        </Link>
      )}
    </div>
  )
}
