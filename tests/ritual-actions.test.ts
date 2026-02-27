import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks (run before any imports) ────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn())
const mockRedirect = vi.hoisted(() => vi.fn())
const mockMembersFindFirst = vi.hoisted(() => vi.fn())
const mockRitualsFindFirst = vi.hoisted(() => vi.fn())
const mockInsertValues = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockInsert = vi.hoisted(() => vi.fn(() => ({ values: mockInsertValues })))
const mockUpdateWhere = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockUpdateSet = vi.hoisted(() => vi.fn(() => ({ where: mockUpdateWhere })))
const mockUpdate = vi.hoisted(() => vi.fn(() => ({ set: mockUpdateSet })))

vi.mock('@/auth', () => ({ auth: mockAuth }))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

vi.mock('@/db', () => ({
  db: {
    query: {
      ritualMembers: { findFirst: mockMembersFindFirst },
      rituals: { findFirst: mockRitualsFindFirst },
    },
    insert: mockInsert,
    update: mockUpdate,
  },
}))

import { updateRitual, joinRitual, createRitual } from '@/lib/ritual-actions'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const SESSION = { user: { id: 'user-1', email: 'z@z.com' } }

const INFERENCE = {
  activityType: 'ski' as const,
  theme: 'circuit' as const,
  tagline: 'No brakes, all glory',
  awards: ['MVP', 'The Totem'],
  slug: 'mavericks',
}

// Make redirect throw to simulate Next.js behavior and halt execution
function setupRedirectThrows() {
  mockRedirect.mockImplementation((url: string) => {
    throw Object.assign(new Error(`REDIRECT:${url}`), { url })
  })
}

// ── updateRitual ──────────────────────────────────────────────────────────────
describe('updateRitual', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockRedirect.mockReset()
    mockMembersFindFirst.mockReset()
    mockInsert.mockReset()
    mockInsert.mockReturnValue({ values: mockInsertValues })
    mockUpdate.mockReset()
    mockUpdate.mockReturnValue({ set: mockUpdateSet })
    mockUpdateSet.mockReset()
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
    mockUpdateWhere.mockReset()
    mockUpdateWhere.mockResolvedValue([])
    setupRedirectThrows()
  })

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(updateRitual('ritual-1', {})).rejects.toThrow('REDIRECT:/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('throws when user is not a sponsor', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockMembersFindFirst.mockResolvedValue(null) // no sponsor membership found
    await expect(updateRitual('ritual-1', { name: 'New Name' })).rejects.toThrow(
      'Only sponsors can update ritual settings'
    )
  })

  it('calls db.update when user is a sponsor', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockMembersFindFirst.mockResolvedValue({ id: 'member-1', role: 'sponsor' })
    await updateRitual('ritual-1', { name: 'Updated Name' })
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('does not include undefined optional fields in the update', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockMembersFindFirst.mockResolvedValue({ id: 'member-1', role: 'sponsor' })
    await updateRitual('ritual-1', { name: 'Updated Name' })
    const setArgs = mockUpdateSet.mock.calls[0][0]
    // tagline/bylaws/foundingYear not provided → not in set payload
    expect(setArgs).not.toHaveProperty('tagline')
    expect(setArgs).not.toHaveProperty('bylaws')
  })

  it('includes tagline in update when explicitly provided', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockMembersFindFirst.mockResolvedValue({ id: 'member-1', role: 'sponsor' })
    await updateRitual('ritual-1', { tagline: 'New tagline' })
    const setArgs = mockUpdateSet.mock.calls[0][0]
    expect(setArgs).toHaveProperty('tagline', 'New tagline')
  })
})

// ── joinRitual ────────────────────────────────────────────────────────────────
describe('joinRitual', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockRedirect.mockReset()
    mockMembersFindFirst.mockReset()
    mockRitualsFindFirst.mockReset()
    mockInsert.mockReset()
    mockInsert.mockReturnValue({ values: mockInsertValues })
    mockInsertValues.mockReset()
    mockInsertValues.mockResolvedValue([])
    setupRedirectThrows()
  })

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(joinRitual('some-token')).rejects.toThrow('REDIRECT:/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('throws when invite token is invalid', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst.mockResolvedValue(null) // no ritual found for token
    await expect(joinRitual('bad-token')).rejects.toThrow('Invalid invite link')
  })

  it('inserts new crew_member when user is not already a member', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst.mockResolvedValue({ id: 'ritual-1', slug: 'torturetour' })
    mockMembersFindFirst.mockResolvedValue(null) // not already a member

    await expect(joinRitual('valid-token')).rejects.toThrow('REDIRECT:/torturetour')
    expect(mockInsert).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/torturetour')
  })

  it('does not insert duplicate if user is already a member', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst.mockResolvedValue({ id: 'ritual-1', slug: 'torturetour' })
    mockMembersFindFirst.mockResolvedValue({ id: 'existing-member' }) // already a member

    await expect(joinRitual('valid-token')).rejects.toThrow('REDIRECT:/torturetour')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('redirects to the ritual slug after joining', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst.mockResolvedValue({ id: 'ritual-1', slug: 'ski-crew' })
    mockMembersFindFirst.mockResolvedValue(null)

    await expect(joinRitual('token')).rejects.toThrow('REDIRECT:/ski-crew')
    expect(mockRedirect).toHaveBeenCalledWith('/ski-crew')
  })
})

// ── createRitual ──────────────────────────────────────────────────────────────
describe('createRitual', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockRedirect.mockReset()
    mockRitualsFindFirst.mockReset()
    mockInsert.mockReset()
    mockInsert.mockReturnValue({ values: mockInsertValues })
    mockInsertValues.mockReset()
    mockInsertValues.mockResolvedValue([])
    setupRedirectThrows()
  })

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(createRitual(INFERENCE, 'Mavericks')).rejects.toThrow('REDIRECT:/login')
  })

  it('uses the inferred slug when it is unique', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst.mockResolvedValue(null) // slug is free
    const result = await createRitual(INFERENCE, 'Mavericks')
    expect(result.slug).toBe('mavericks')
  })

  it('appends -1 when the base slug is already taken', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst
      .mockResolvedValueOnce({ id: 'existing' }) // 'mavericks' taken
      .mockResolvedValueOnce(null)               // 'mavericks-1' is free
    const result = await createRitual(INFERENCE, 'Mavericks')
    expect(result.slug).toBe('mavericks-1')
  })

  it('appends -2 when both base and -1 are taken', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst
      .mockResolvedValueOnce({ id: 'taken-1' }) // 'mavericks' taken
      .mockResolvedValueOnce({ id: 'taken-2' }) // 'mavericks-1' taken
      .mockResolvedValueOnce(null)              // 'mavericks-2' is free
    const result = await createRitual(INFERENCE, 'Mavericks')
    expect(result.slug).toBe('mavericks-2')
  })

  it('creates ritual, awards, and membership in order', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst.mockResolvedValue(null)
    await createRitual(INFERENCE, 'Mavericks')
    // insert called 3 times: rituals, awardDefinitions, ritualMembers
    expect(mockInsert).toHaveBeenCalledTimes(3)
  })

  it('assigns first award as mvp and second as lup', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst.mockResolvedValue(null)

    const capturedAwards: { type: string }[] = []
    mockInsertValues.mockImplementation(async (rows: unknown) => {
      if (Array.isArray(rows)) capturedAwards.push(...(rows as { type: string }[]))
      return []
    })

    await createRitual(INFERENCE, 'Mavericks')
    expect(capturedAwards[0]?.type).toBe('mvp')
    expect(capturedAwards[1]?.type).toBe('lup')
  })

  it('skips award insert when awards array is empty', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst.mockResolvedValue(null)
    await createRitual({ ...INFERENCE, awards: [] }, 'Mavericks')
    // insert called 2 times: rituals and ritualMembers only (no awards)
    expect(mockInsert).toHaveBeenCalledTimes(2)
  })

  it('adds the creator as sponsor with isCoreCrewe true', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst.mockResolvedValue(null)

    let memberInsertArgs: Record<string, unknown> | null = null
    mockInsertValues.mockImplementation(async (rows: unknown) => {
      // The last insert is the ritualMembers insert (single object, not array)
      if (!Array.isArray(rows) && (rows as Record<string, unknown>).role) {
        memberInsertArgs = rows as Record<string, unknown>
      }
      return []
    })

    await createRitual(INFERENCE, 'Mavericks')
    expect(memberInsertArgs?.role).toBe('sponsor')
    expect(memberInsertArgs?.isCoreCrewe).toBe(true)
    expect(memberInsertArgs?.userId).toBe(SESSION.user.id)
  })

  it('returns slug and inviteToken', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockRitualsFindFirst.mockResolvedValue(null)
    const result = await createRitual(INFERENCE, 'Mavericks')
    expect(result).toHaveProperty('slug')
    expect(result).toHaveProperty('inviteToken')
    expect(typeof result.inviteToken).toBe('string')
    expect(result.inviteToken.length).toBeGreaterThan(0)
  })
})
