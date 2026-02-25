'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = ['Tour', 'About', 'Crew', 'Lore', 'Merch'] as const

export function TabBar({ ritualSlug }: { ritualSlug: string }) {
  const pathname = usePathname()

  function tabHref(tab: string) {
    return tab === 'Tour' ? `/${ritualSlug}` : `/${ritualSlug}/${tab.toLowerCase()}`
  }

  function isActive(tab: string) {
    const href = tabHref(tab)
    return tab === 'Tour' ? pathname === href : pathname.startsWith(href)
  }

  return (
    <div className="flex border-b border-[var(--border)] -mx-4 px-4 overflow-x-auto">
      {TABS.map((tab) => (
        <Link
          key={tab}
          href={tabHref(tab)}
          className={`shrink-0 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            isActive(tab)
              ? 'border-[var(--accent)] text-[var(--fg)]'
              : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
          }`}
        >
          {tab}
        </Link>
      ))}
    </div>
  )
}
