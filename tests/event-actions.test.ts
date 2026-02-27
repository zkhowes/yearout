import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn())
const mockRedirect = vi.hoisted(() => vi.fn())
const mockMembersFindFirst = vi.hoisted(() => vi.fn())
const mockProposalsFindFirst = vi.hoisted(() => vi.fn())
const mockVotesFindFirst = vi.hoisted(() => vi.fn())
const mockEventsFindFirst = vi.hoisted(() => vi.fn())

const mockInsertValues = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockInsertOnConflict = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockInsert = vi.hoisted(() => vi.fn(() => ({ values: mockInsertValues })))

const mockUpdateWhere = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockUpdateSet = vi.hoisted(() => vi.fn(() => ({ where: mockUpdateWhere })))
const mockUpdate = vi.hoisted(() => vi.fn(() => ({ set: mockUpdateSet })))

const mockDeleteWhere = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockDelete = vi.hoisted(() => vi.fn(() => ({ where: mockDeleteWhere })))

const mockSelectWhere = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockSelectFrom = vi.hoisted(() => vi.fn(() => ({ where: mockSelectWhere })))
const mockSelect = vi.hoisted(() => vi.fn(() => ({ from: mockSelectFrom })))

vi.mock('@/auth', () => ({ auth: mockAuth }))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

vi.mock('@/db', () => ({
  db: {
    query: {
      ritualMembers: { findFirst: mockMembersFindFirst },
      eventProposals: { findFirst: mockProposalsFindFirst },
      proposalVotes: { findFirst: mockVotesFindFirst },
      events: { findFirst: mockEventsFindFirst },
    },
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
  },
}))

import {
  createEvent,
  addProposal,
  castVote,
  lockProposal,
  deleteProposal,
} from '@/lib/event-actions'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const SESSION = { user: { id: 'user-1', email: 'z@z.com' } }
const SPONSOR_MEMBER = { id: 'member-1', role: 'sponsor', ritualId: 'ritual-1' }

function setupRedirectThrows() {
  mockRedirect.mockImplementation((url: string) => {
    throw Object.assign(new Error(`REDIRECT:${url}`), { url })
  })
}

function resetAll() {
  mockAuth.mockReset()
  mockRedirect.mockReset()
  mockMembersFindFirst.mockReset()
  mockProposalsFindFirst.mockReset()
  mockVotesFindFirst.mockReset()
  mockEventsFindFirst.mockReset()
  mockInsert.mockReset()
  mockInsert.mockReturnValue({ values: mockInsertValues })
  mockInsertValues.mockReset()
  mockInsertValues.mockResolvedValue([])
  mockInsertValues.mockReturnValue({ onConflictDoNothing: mockInsertOnConflict, then: undefined })
  mockInsertOnConflict.mockReset()
  mockInsertOnConflict.mockResolvedValue([])
  mockSelect.mockReset()
  mockSelect.mockReturnValue({ from: mockSelectFrom })
  mockSelectFrom.mockReset()
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere })
  mockSelectWhere.mockReset()
  mockSelectWhere.mockResolvedValue([])
  mockUpdate.mockReset()
  mockUpdate.mockReturnValue({ set: mockUpdateSet })
  mockUpdateSet.mockReset()
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
  mockUpdateWhere.mockReset()
  mockUpdateWhere.mockResolvedValue([])
  mockDelete.mockReset()
  mockDelete.mockReturnValue({ where: mockDeleteWhere })
  mockDeleteWhere.mockReset()
  mockDeleteWhere.mockResolvedValue([])
  setupRedirectThrows()
}

// ── createEvent ───────────────────────────────────────────────────────────────
describe('createEvent', () => {
  beforeEach(resetAll)

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(createEvent('ritual-1', 'torturetour', { name: 'TT 2026', year: 2026 })).rejects.toThrow(
      'REDIRECT:/login'
    )
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('throws when user is not a sponsor', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockMembersFindFirst.mockResolvedValue(null) // no sponsor membership
    await expect(
      createEvent('ritual-1', 'torturetour', { name: 'TT 2026', year: 2026 })
    ).rejects.toThrow('Only the sponsor can create events')
  })

  it('creates event with status=planning and null location', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockMembersFindFirst.mockResolvedValue(SPONSOR_MEMBER)

    let eventInsertArgs: Record<string, unknown> | null = null
    mockInsertValues.mockImplementation(async (row: unknown) => {
      if (!Array.isArray(row) && (row as Record<string, unknown>).status) {
        eventInsertArgs = row as Record<string, unknown>
      }
      return []
    })

    await expect(
      createEvent('ritual-1', 'torturetour', { name: 'TT 2026', year: 2026 })
    ).rejects.toThrow('REDIRECT:/torturetour/2026')

    expect(eventInsertArgs?.status).toBe('planning')
    expect(eventInsertArgs?.location).toBeNull()
  })

  it('creates an initial proposal when location is provided', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockMembersFindFirst.mockResolvedValue(SPONSOR_MEMBER)

    await expect(
      createEvent('ritual-1', 'torturetour', {
        name: 'TT 2026',
        year: 2026,
        location: 'Whistler, BC',
      })
    ).rejects.toThrow('REDIRECT:/torturetour/2026')

    // insert called twice: event + proposal
    expect(mockInsert).toHaveBeenCalledTimes(2)
  })

  it('creates an initial proposal when proposedDates is provided', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockMembersFindFirst.mockResolvedValue(SPONSOR_MEMBER)

    await expect(
      createEvent('ritual-1', 'torturetour', {
        name: 'TT 2026',
        year: 2026,
        proposedDates: 'Jan 15-20',
      })
    ).rejects.toThrow('REDIRECT:/torturetour/2026')

    expect(mockInsert).toHaveBeenCalledTimes(2)
  })

  it('skips proposal creation when no location or dates provided', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockMembersFindFirst.mockResolvedValue(SPONSOR_MEMBER)

    await expect(
      createEvent('ritual-1', 'torturetour', { name: 'TT 2026', year: 2026 })
    ).rejects.toThrow('REDIRECT:/torturetour/2026')

    // insert called once: event only
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('redirects to /[ritualSlug]/[year] on success', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockMembersFindFirst.mockResolvedValue(SPONSOR_MEMBER)

    await expect(
      createEvent('ritual-1', 'torturetour', { name: 'TT 2026', year: 2026 })
    ).rejects.toThrow('REDIRECT:/torturetour/2026')

    expect(mockRedirect).toHaveBeenCalledWith('/torturetour/2026')
  })
})

// ── addProposal ───────────────────────────────────────────────────────────────
describe('addProposal', () => {
  beforeEach(resetAll)

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(addProposal('event-1', { location: 'Vail' })).rejects.toThrow('REDIRECT:/login')
  })

  it('inserts proposal with trimmed location and dates', async () => {
    mockAuth.mockResolvedValue(SESSION)

    let insertedRow: Record<string, unknown> | null = null
    mockInsertValues.mockImplementation(async (row: unknown) => {
      insertedRow = row as Record<string, unknown>
      return []
    })

    await addProposal('event-1', { location: '  Vail  ', dates: '  Feb 1-7  ', notes: 'Fun trip' })

    expect(insertedRow?.location).toBe('Vail')
    expect(insertedRow?.dates).toBe('Feb 1-7')
    expect(insertedRow?.eventId).toBe('event-1')
    expect(insertedRow?.proposedBy).toBe(SESSION.user.id)
  })

  it('stores null when location and dates are empty strings', async () => {
    mockAuth.mockResolvedValue(SESSION)

    let insertedRow: Record<string, unknown> | null = null
    mockInsertValues.mockImplementation(async (row: unknown) => {
      insertedRow = row as Record<string, unknown>
      return []
    })

    await addProposal('event-1', { location: '', dates: '' })

    expect(insertedRow?.location).toBeNull()
    expect(insertedRow?.dates).toBeNull()
  })
})

// ── castVote ──────────────────────────────────────────────────────────────────
describe('castVote', () => {
  beforeEach(resetAll)

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(castVote('proposal-1', 'yes')).rejects.toThrow('REDIRECT:/login')
  })

  it('inserts a new vote when none exists', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockVotesFindFirst.mockResolvedValue(null) // no existing vote

    await castVote('proposal-1', 'yes')

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('updates existing vote instead of inserting duplicate', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockVotesFindFirst.mockResolvedValue({ id: 'vote-1', vote: 'yes' }) // existing vote

    await castVote('proposal-1', 'no')

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockInsert).not.toHaveBeenCalled()
    const setArgs = mockUpdateSet.mock.calls[0][0]
    expect(setArgs.vote).toBe('no')
  })
})

// ── lockProposal ──────────────────────────────────────────────────────────────
describe('lockProposal', () => {
  beforeEach(resetAll)

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(lockProposal('proposal-1', 'torturetour')).rejects.toThrow('REDIRECT:/login')
  })

  it('throws when proposal is not found', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockProposalsFindFirst.mockResolvedValue(null)
    await expect(lockProposal('proposal-1', 'torturetour')).rejects.toThrow('Proposal not found')
  })

  it('throws when event is not found', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockProposalsFindFirst.mockResolvedValue({ id: 'proposal-1', eventId: 'event-1', location: 'Vail' })
    mockEventsFindFirst.mockResolvedValue(null)
    await expect(lockProposal('proposal-1', 'torturetour')).rejects.toThrow('Event not found')
  })

  it('throws when user is not a sponsor', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockProposalsFindFirst.mockResolvedValue({ id: 'proposal-1', eventId: 'event-1', location: 'Vail' })
    mockEventsFindFirst.mockResolvedValue({ id: 'event-1', ritualId: 'ritual-1', year: 2026 })
    mockMembersFindFirst.mockResolvedValue(null) // no sponsor membership

    await expect(lockProposal('proposal-1', 'torturetour')).rejects.toThrow(
      'Only sponsors can lock proposals'
    )
  })

  it('updates event status to scheduled and sets location from proposal', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockProposalsFindFirst.mockResolvedValue({
      id: 'proposal-1',
      eventId: 'event-1',
      location: 'Whistler, BC',
    })
    mockEventsFindFirst.mockResolvedValue({ id: 'event-1', ritualId: 'ritual-1', year: 2025 })
    mockMembersFindFirst.mockResolvedValue(SPONSOR_MEMBER)

    await expect(lockProposal('proposal-1', 'torturetour')).rejects.toThrow(
      'REDIRECT:/torturetour/2025'
    )

    expect(mockUpdate).toHaveBeenCalled()
    const setArgs = mockUpdateSet.mock.calls[0][0]
    expect(setArgs.status).toBe('scheduled')
    expect(setArgs.location).toBe('Whistler, BC')
  })

  it('redirects to /[ritualSlug]/[year] after locking', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockProposalsFindFirst.mockResolvedValue({ id: 'proposal-1', eventId: 'event-1', location: 'Vail' })
    mockEventsFindFirst.mockResolvedValue({ id: 'event-1', ritualId: 'ritual-1', year: 2026 })
    mockMembersFindFirst.mockResolvedValue(SPONSOR_MEMBER)

    await expect(lockProposal('proposal-1', 'torturetour')).rejects.toThrow(
      'REDIRECT:/torturetour/2026'
    )
    expect(mockRedirect).toHaveBeenCalledWith('/torturetour/2026')
  })
})

// ── deleteProposal ────────────────────────────────────────────────────────────
describe('deleteProposal', () => {
  beforeEach(resetAll)

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(deleteProposal('proposal-1')).rejects.toThrow('REDIRECT:/login')
  })

  it('calls db.delete and scopes deletion to current user', async () => {
    mockAuth.mockResolvedValue(SESSION)
    await deleteProposal('proposal-1')
    expect(mockDelete).toHaveBeenCalledTimes(1)
    // The WHERE clause uses AND(proposalId, proposedBy) — can't inspect Drizzle SQL
    // directly, but assert delete was called (not update/insert)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
