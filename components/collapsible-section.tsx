'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function CollapsibleSection({
  icon,
  label,
  borderColor,
  children,
}: {
  icon: React.ReactNode
  label: string
  borderColor: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`rounded-xl border border-[var(--border)] border-l-4 ${borderColor} bg-[var(--surface)] p-4 flex flex-col gap-3`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full"
      >
        {icon}
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)] flex-1 text-left">{label}</p>
        <ChevronDown
          size={16}
          className={`text-[var(--fg-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && children}
    </div>
  )
}
