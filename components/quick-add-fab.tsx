'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Plus, BookOpen, BarChart3, DollarSign } from 'lucide-react'

const MENU_ITEMS = [
  { tab: 'lore' as const, label: 'Add Lore', icon: BookOpen, color: 'bg-purple-500' },
  { tab: 'stats' as const, label: 'Add Stats', icon: BarChart3, color: 'bg-blue-500' },
  { tab: 'expenses' as const, label: 'Add Expense', icon: DollarSign, color: 'bg-green-500' },
]

export type QuickAddTab = 'lore' | 'stats' | 'expenses'

export function QuickAddFab({
  onSelect,
  renderForm,
}: {
  onSelect?: (tab: QuickAddTab) => void
  renderForm?: (tab: QuickAddTab, onClose: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [activeForm, setActiveForm] = useState<QuickAddTab | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open && !activeForm) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        // Don't close active form on outside click — let the form's Cancel handle it
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, activeForm])

  // Lock body scroll when form sheet is open
  useEffect(() => {
    if (activeForm) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [activeForm])

  function handleAction(tab: QuickAddTab) {
    setOpen(false)
    if (renderForm) {
      setActiveForm(tab)
    } else {
      onSelect?.(tab)
    }
  }

  function handleFormClose() {
    setActiveForm(null)
  }

  return (
    <>
      {/* Bottom sheet for inline form */}
      {activeForm && renderForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleFormClose}
            style={{ animation: 'fab-backdrop-in 200ms ease-out' }}
          />
          {/* Sheet */}
          <div
            className="relative w-full max-w-lg mx-auto bg-[var(--bg)] rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
            style={{ animation: 'fab-sheet-in 250ms ease-out' }}
          >
            <div className="p-4">
              {renderForm(activeForm, handleFormClose)}
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <div ref={ref} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {open && !activeForm && (
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

        {!activeForm && (
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
        )}
      </div>
    </>
  )
}
