'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'

export function Header() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 bg-[var(--bg)] border-b border-[var(--border)]"
      style={{ height: 'var(--header-height)' }}
    >
      <Link
        href="/"
        className="text-lg font-bold tracking-tight text-[var(--fg)] leading-none"
      >
        Yearout
      </Link>
      <button
        aria-label="Open menu"
        className="p-1 text-[var(--fg)] hover:opacity-70 transition-opacity"
      >
        <Menu size={22} />
      </button>
    </header>
  )
}
