import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn())
const mockRedirect = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockExpensesFindFirst = vi.hoisted(() => vi.fn())
const mockSettlementPaymentsFindFirst = vi.hoisted(() => vi.fn())
const mockEventsFindFirst = vi.hoisted(() => vi.fn())
const mockMembersFindFirst = vi.hoisted(() => vi.fn())
const mockAttendeesFindFirst = vi.hoisted(() => vi.fn())

const mockInsertValues = vi.hoisted(() => vi.fn().mockResolvedValue([]))
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

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@/db', () => ({
  db: {
    query: {
      ritualMembers: { findFirst: mockMembersFindFirst },
      events: { findFirst: mockEventsFindFirst },
      eventAttendees: { findFirst: mockAttendeesFindFirst },
      expenses: { findFirst: mockExpensesFindFirst },
      settlementPayments: { findFirst: mockSettlementPaymentsFindFirst },
    },
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
  },
}))

import {
  addExpense,
  updateExpense,
  deleteExpense,
  markSettlementPaid,
  confirmSettlementPayment,
  resetSettlementPayment,
} from '@/lib/event-actions'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const SESSION = { user: { id: 'user-1', email: 'z@z.com' } }

function setupRedirectThrows() {
  mockRedirect.mockImplementation((url: string) => {
    throw Object.assign(new Error(`REDIRECT:${url}`), { url })
  })
}

function resetAll() {
  mockAuth.mockReset()
  mockRedirect.mockReset()
  mockRevalidatePath.mockReset()
  mockExpensesFindFirst.mockReset()
  mockSettlementPaymentsFindFirst.mockReset()
  mockEventsFindFirst.mockReset()
  mockMembersFindFirst.mockReset()
  mockAttendeesFindFirst.mockReset()
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

// ── addExpense ────────────────────────────────────────────────────────────────

describe('addExpense', () => {
  beforeEach(resetAll)

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(
      addExpense('event-1', 'tt', 2026, 'Dinner', 5000)
    ).rejects.toThrow('REDIRECT:/login')
  })

  it('creates expense + splits with equal split (default attendees)', async () => {
    mockAuth.mockResolvedValue(SESSION)
    // Mock attendees query
    mockSelectWhere.mockResolvedValue([
      { userId: 'user-1', bookingStatus: 'all_booked' },
      { userId: 'user-2', bookingStatus: 'committed' },
      { userId: 'user-3', bookingStatus: 'out' },
    ])

    await addExpense('event-1', 'tt', 2026, 'Dinner', 3000)

    // Two inserts: expense + splits
    expect(mockInsert).toHaveBeenCalledTimes(2)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/tt/2026')
  })

  it('creates expense with exact split', async () => {
    mockAuth.mockResolvedValue(SESSION)

    await addExpense('event-1', 'tt', 2026, 'Lodging', 5000, {
      splitType: 'exact',
      splitUserIds: ['user-1', 'user-2'],
      exactAmounts: [
        { userId: 'user-1', amount: 3000 },
        { userId: 'user-2', amount: 2000 },
      ],
    })

    expect(mockInsert).toHaveBeenCalledTimes(2)
  })

  it('throws on invalid exact split', async () => {
    mockAuth.mockResolvedValue(SESSION)

    await expect(
      addExpense('event-1', 'tt', 2026, 'Lodging', 5000, {
        splitType: 'exact',
        splitUserIds: ['user-1', 'user-2'],
        exactAmounts: [
          { userId: 'user-1', amount: 3000 },
          { userId: 'user-2', amount: 1000 },
        ],
      })
    ).rejects.toThrow('4000')
  })
})

// ── updateExpense ─────────────────────────────────────────────────────────────

describe('updateExpense', () => {
  beforeEach(resetAll)

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(
      updateExpense('exp-1', 'tt', 2026, 'Updated', 5000)
    ).rejects.toThrow('REDIRECT:/login')
  })

  it('throws when expense not found', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockExpensesFindFirst.mockResolvedValue(null)
    await expect(
      updateExpense('exp-1', 'tt', 2026, 'Updated', 5000)
    ).rejects.toThrow('Expense not found')
  })

  it('throws when not the creator', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockExpensesFindFirst.mockResolvedValue({
      id: 'exp-1',
      paidBy: 'other-user',
      eventId: 'event-1',
    })
    await expect(
      updateExpense('exp-1', 'tt', 2026, 'Updated', 5000)
    ).rejects.toThrow('Only the creator')
  })

  it('updates expense, deletes old splits, inserts new ones', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockExpensesFindFirst.mockResolvedValue({
      id: 'exp-1',
      paidBy: 'user-1',
      eventId: 'event-1',
    })
    // Mock attendees for default splits
    mockSelectWhere.mockResolvedValue([
      { userId: 'user-1', bookingStatus: 'all_booked' },
      { userId: 'user-2', bookingStatus: 'committed' },
    ])

    await updateExpense('exp-1', 'tt', 2026, 'Updated dinner', 4000)

    // update expense, delete old splits, insert new splits
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/tt/2026')
  })
})

// ── deleteExpense ─────────────────────────────────────────────────────────────

describe('deleteExpense', () => {
  beforeEach(resetAll)

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(deleteExpense('exp-1', 'tt', 2026)).rejects.toThrow('REDIRECT:/login')
  })

  it('deletes expense scoped to current user', async () => {
    mockAuth.mockResolvedValue(SESSION)
    await deleteExpense('exp-1', 'tt', 2026)
    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/tt/2026')
  })
})

// ── markSettlementPaid ────────────────────────────────────────────────────────

describe('markSettlementPaid', () => {
  beforeEach(resetAll)

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(
      markSettlementPaid('event-1', 'tt', 2026, 'user-2', 1000)
    ).rejects.toThrow('REDIRECT:/login')
  })

  it('creates new payment when none exists', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockSettlementPaymentsFindFirst.mockResolvedValue(null)

    await markSettlementPaid('event-1', 'tt', 2026, 'user-2', 1000)

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/tt/2026')
  })

  it('updates existing pending payment', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockSettlementPaymentsFindFirst.mockResolvedValue({
      id: 'pay-1',
      status: 'pending',
    })

    await markSettlementPaid('event-1', 'tt', 2026, 'user-2', 1000)

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('throws when payment already marked paid', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockSettlementPaymentsFindFirst.mockResolvedValue({
      id: 'pay-1',
      status: 'paid',
    })

    await expect(
      markSettlementPaid('event-1', 'tt', 2026, 'user-2', 1000)
    ).rejects.toThrow('already marked')
  })
})

// ── confirmSettlementPayment ─────────────────────────────────────────────────

describe('confirmSettlementPayment', () => {
  beforeEach(resetAll)

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(
      confirmSettlementPayment('pay-1', 'tt', 2026)
    ).rejects.toThrow('REDIRECT:/login')
  })

  it('throws when payment not found', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockSettlementPaymentsFindFirst.mockResolvedValue(null)
    await expect(
      confirmSettlementPayment('pay-1', 'tt', 2026)
    ).rejects.toThrow('Payment not found')
  })

  it('allows creditor to confirm', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockSettlementPaymentsFindFirst.mockResolvedValue({
      id: 'pay-1',
      eventId: 'event-1',
      fromUserId: 'user-2',
      toUserId: 'user-1', // current user is creditor
      status: 'paid',
    })

    await confirmSettlementPayment('pay-1', 'tt', 2026)

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    const setArgs = mockUpdateSet.mock.calls[0][0]
    expect(setArgs.status).toBe('confirmed')
    expect(setArgs.confirmedBy).toBe('user-1')
  })
})

// ── resetSettlementPayment ───────────────────────────────────────────────────

describe('resetSettlementPayment', () => {
  beforeEach(resetAll)

  it('redirects to login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(
      resetSettlementPayment('pay-1', 'tt', 2026)
    ).rejects.toThrow('REDIRECT:/login')
  })

  it('throws when payment not found', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockSettlementPaymentsFindFirst.mockResolvedValue(null)
    await expect(
      resetSettlementPayment('pay-1', 'tt', 2026)
    ).rejects.toThrow('Payment not found')
  })

  it('resets payment to pending (requires sponsor/host)', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockSettlementPaymentsFindFirst.mockResolvedValue({
      id: 'pay-1',
      eventId: 'event-1',
      status: 'paid',
    })
    // requireSponsorOrHost mocks
    mockEventsFindFirst.mockResolvedValue({ id: 'event-1', ritualId: 'ritual-1' })
    mockMembersFindFirst.mockResolvedValue({ role: 'sponsor' })

    await resetSettlementPayment('pay-1', 'tt', 2026)

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    const setArgs = mockUpdateSet.mock.calls[0][0]
    expect(setArgs.status).toBe('pending')
    expect(setArgs.paidAt).toBeNull()
    expect(setArgs.confirmedAt).toBeNull()
  })
})
