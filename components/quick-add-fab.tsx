'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, BookOpen, BarChart3, DollarSign } from 'lucide-react'

const MENU_ITEMS = [
  { tab: 'lore' as const, label: 'Add Lore', icon: BookOpen, color: 'bg-purple-500' },
  { tab: 'stats' as const, label: 'Add Stats', icon: BarChart3, color: 'bg-blue-500' },
  { tab: 'expenses' as const, label: 'Add Expense', icon: DollarSign, color: 'bg-green-500' },
]

export type QuickAddTab = 'lore' | 'stats' | 'expenses'

export function QuickAddFab({
  onSelect,
}: {
  onSelect: (tab: QuickAddTab) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleAction(tab: QuickAddTab) {
    setOpen(false)
    onSelect(tab)
  }

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col items-end gap-2" style={{ animation: 'fab-menu-in 150ms ease-out' }}>
          {MENU_ITEMS.map((item) => (
            <button
              key={item.tab}
              onClick={() => handleAction(item.tab)}
              className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-lg hover:bg-[var(--bg)] transition-colors"
            >
              <span className="text-sm font-medium text-[var(--fg)] whitespace-nowrap">{item.label}</span>
              <span className={`${item.color} rounded-full p-1.5 text-white`}>
                <item.icon size={16} />
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open
            ? 'bg-[var(--fg)] text-[var(--bg)] rotate-45'
            : 'bg-[var(--accent)] text-white'
        }`}
        aria-label={open ? 'Close menu' : 'Quick add'}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  )
}
