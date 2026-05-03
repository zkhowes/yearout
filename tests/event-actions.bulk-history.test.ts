import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn())
const mockRedirect = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockMembersFindFirst = vi.hoisted(() => vi.fn())
const mockRitualsFindFirst = vi.hoisted(() => vi.fn())

const mockInsertValues = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockInsert = vi.hoisted(() => vi.fn(() => ({ values: mockInsertValues })))

const mockSelectWhere = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockSelectFrom = vi.hoisted(() => vi.fn(() => ({ where: mockSelectWhere })))
const mockSelect = vi.hoisted(() => vi.fn(() => ({ from: mockSelectFrom })))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

vi.mock('@/db', () => ({
  db: {
    query: {
      ritualMembers: { findFirst: mockMembersFindFirst },
      rituals: { findFirst: mockRitualsFindFirst },
    },
    insert: mockInsert,
    select: mockSelect,
  },
}))

import { bulkHistoryEnterEvents } from '@/lib/event-actions'

const SESSION = { user: { id: 'user-1' } }
const SPONSOR_MEMBER = { id: 'member-1', role: 'sponsor', ritualId: 'ritual-1' }
const RITUAL = { id: 'ritual-1', name: 'The Powder Circuit', slug: 'powder' }

function resetAll() {
  mockAuth.mockReset()
  mockRedirect.mockReset()
  mockRevalidatePath.mockReset()
  mockMembersFindFirst.mockReset()
  mockRitualsFindFirst.mockReset()
  mockInsert.mockReset()
  mockInsert.mockReturnValue({ values: mockInsertValues })
  mockInsertValues.mockReset()
  mockInsertValues.mockResolvedValue([])
  mockSelect.mockReset()
  mockSelect.mockReturnValue({ from: mockSelectFrom })
  mockSelectFrom.mockReset()
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere })
  mockSelectWhere.mockReset()
  mockSelectWhere.mockResolvedValue([])
  mockAuth.mockResolvedValue(SESSION)
  mockMembersFindFirst.mockResolvedValue(SPONSOR_MEMBER)
  mockRitualsFindFirst.mockResolvedValue(RITUAL)
}

describe('bulkHistoryEnterEvents', () => {
  beforeEach(() => {
    resetAll()
  })

  it('rejects non-sponsor callers', async () => {
    mockMembersFindFirst.mockResolvedValue(null)
    await expect(
      bulkHistoryEnterEvents('ritual-1', 'powder', [
        { year: 2020, location: 'Aspen' },
      ]),
    ).rejects.toThrow(/sponsor/i)
  })

  it('returns inserted=0 with all skipped when every row is invalid', async () => {
    const result = await bulkHistoryEnterEvents('ritual-1', 'powder', [
      { year: 1899, location: 'too old' },
      { year: 2020, location: '' },
    ])
    expect(result.inserted).toBe(0)
    expect(result.skipped).toHaveLength(2)
    expect(result.skipped.every((s) => s.reason === 'invalid')).toBe(true)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('inserts valid rows and skips duplicates from the unique constraint pre-flight', async () => {
    // Pre-flight returns one existing row to mark as duplicate
    mockSelectWhere.mockResolvedValueOnce([
      { year: 2020, name: 'The Powder Circuit 2020' },
    ])

    const result = await bulkHistoryEnterEvents('ritual-1', 'powder', [
      { year: 2020, location: 'Aspen' }, // duplicate
      { year: 2021, location: 'Jackson Hole' },
      { year: 2022, location: 'Whistler', memory: 'crashed the gondola' },
    ])

    expect(result.inserted).toBe(2)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0]).toMatchObject({ year: 2020, reason: 'duplicate' })

    // Verify insert was called for events
    expect(mockInsert).toHaveBeenCalled()
    const insertedEvents = mockInsertValues.mock.calls[0][0] as Array<{
      year: number
      name: string
      status: string
    }>
    expect(insertedEvents).toHaveLength(2)
    expect(insertedEvents.every((e) => e.status === 'closed')).toBe(true)
    expect(insertedEvents.map((e) => e.year).sort()).toEqual([2021, 2022])
    expect(insertedEvents.find((e) => e.year === 2022)?.name).toBe(
      'The Powder Circuit 2022',
    )
  })

  it('inserts a lore entry only for rows with a memory', async () => {
    mockSelectWhere.mockResolvedValue([])

    await bulkHistoryEnterEvents('ritual-1', 'powder', [
      { year: 2021, location: 'Jackson' }, // no memory
      { year: 2022, location: 'Whistler', memory: 'crashed the gondola' },
      { year: 2023, location: 'Aspen', memory: 'best year' },
    ])

    // Three insert calls expected: events, (no awards if defs empty), lore entries.
    // mockSelectWhere is the awardDefs query — returns []; so only events + lore.
    const calls = mockInsertValues.mock.calls
    // First call = events (3 rows). Last call = lore entries (2 rows).
    expect(calls.length).toBeGreaterThanOrEqual(2)
    const lastCallArg = calls[calls.length - 1][0] as Array<{
      type: string
      content: string
    }>
    expect(lastCallArg).toHaveLength(2)
    expect(lastCallArg.every((r) => r.type === 'memory')).toBe(true)
    expect(lastCallArg.map((r) => r.content)).toEqual([
      'crashed the gondola',
      'best year',
    ])
  })

  it('auto-links up to 3 award definitions per inserted event', async () => {
    // Pre-flight uniqueness: no duplicates
    mockSelectWhere.mockResolvedValueOnce([])
    // Award defs query returns 5 — should cap at 3
    mockSelectWhere.mockResolvedValueOnce([
      { id: 'a1' },
      { id: 'a2' },
      { id: 'a3' },
      { id: 'a4' },
      { id: 'a5' },
    ])

    await bulkHistoryEnterEvents('ritual-1', 'powder', [
      { year: 2021, location: 'A' },
      { year: 2022, location: 'B' },
    ])

    // Expected insert calls: 1) events (2), 2) eventAwardLinks (2 events × 3 defs = 6), 3) (no lore — none provided)
    const calls = mockInsertValues.mock.calls
    expect(calls.length).toBe(2)
    const linkRows = calls[1][0] as Array<{
      eventId: string
      awardDefinitionId: string
    }>
    expect(linkRows).toHaveLength(6)
    const uniqueAwardIds = new Set(linkRows.map((r) => r.awardDefinitionId))
    expect(uniqueAwardIds.size).toBe(3) // capped at 3, not 5
  })

  it('skips award-link insert when ritual has no award defs', async () => {
    mockSelectWhere.mockResolvedValueOnce([]) // pre-flight: no duplicates
    mockSelectWhere.mockResolvedValueOnce([]) // award defs: empty

    await bulkHistoryEnterEvents('ritual-1', 'powder', [
      { year: 2021, location: 'A' },
    ])

    // Only one insert: events. No award-link insert, no lore (memory missing).
    expect(mockInsertValues).toHaveBeenCalledTimes(1)
  })

  it('revalidates the ritual page after success', async () => {
    mockSelectWhere.mockResolvedValue([])
    await bulkHistoryEnterEvents('ritual-1', 'powder', [
      { year: 2021, location: 'A' },
    ])
    expect(mockRevalidatePath).toHaveBeenCalledWith('/powder')
  })
})
