'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { signOut } from 'next-auth/react'

type HeaderUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

export function Header({ user }: { user?: HeaderUser }) {
  const [open, setOpen] = useState(false)

  return (
    <>
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
          onClick={() => setOpen(true)}
          className="p-2 text-[var(--fg)] hover:opacity-70 transition-opacity"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-[var(--bg)] border-l border-[var(--border)] shadow-xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-end p-4">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="p-2 text-[var(--fg)] hover:opacity-70 transition-opacity"
          >
            <X size={22} />
          </button>
        </div>

        {user && (
          <div className="flex flex-col items-center gap-2 px-6 pb-6 border-b border-[var(--border)]">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[var(--border)] flex items-center justify-center text-[var(--fg-muted)] text-lg font-semibold">
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <span className="text-sm font-semibold text-[var(--fg)] text-center">
              {user.name}
            </span>
            <span className="text-xs text-[var(--fg-muted)] text-center">
              {user.email}
            </span>
          </div>
        )}

        <nav className="flex flex-col p-4 gap-1">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm text-[var(--fg)] hover:bg-[var(--border)] transition-colors"
          >
            Profile
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="px-3 py-2.5 rounded-lg text-sm text-left text-[var(--fg)] hover:bg-[var(--border)] transition-colors"
          >
            Sign Out
          </button>
        </nav>
      </div>
    </>
  )
}
