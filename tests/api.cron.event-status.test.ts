import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockUpdateWhere = vi.hoisted(() => vi.fn())
const mockUpdateSet = vi.hoisted(() => vi.fn())
const mockUpdate = vi.hoisted(() => vi.fn())
const mockReturning = vi.hoisted(() => vi.fn())

vi.mock('@/db', () => ({
  db: {
    update: mockUpdate,
  },
}))

vi.mock('@/db/schema', () => ({
  events: {
    status: 'status',
    startDate: 'start_date',
    endDate: 'end_date',
    id: 'id',
    name: 'name',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  lte: vi.fn((...args: unknown[]) => ({ type: 'lte', args })),
}))

import { GET } from '@/app/api/cron/event-status/route'

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeReq(token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  return new Request('http://localhost/api/cron/event-status', { headers })
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('GET /api/cron/event-status', () => {
  beforeEach(() => {
    mockUpdate.mockReset()
    mockUpdateSet.mockReset()
    mockUpdateWhere.mockReset()
    mockReturning.mockReset()

    mockReturning.mockResolvedValue([])
    mockUpdateWhere.mockReturnValue({ returning: mockReturning })
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
    mockUpdate.mockReturnValue({ set: mockUpdateSet })

    process.env.CRON_SECRET = 'test-secret'
  })

  it('returns 401 when no authorization header', async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is wrong', async () => {
    const res = await GET(makeReq('wrong-token'))
    expect(res.status).toBe(401)
  })

  it('returns 200 with started count when token is correct', async () => {
    mockReturning
      .mockResolvedValueOnce([{ id: 'e1', name: 'TT 2025' }]) // started
      .mockResolvedValueOnce([]) // concluded
    const res = await GET(makeReq('test-secret'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.started).toBe(1)
    expect(data.events.started).toHaveLength(1)
  })

  it('returns 0 started when no events match', async () => {
    mockReturning.mockResolvedValue([])
    const res = await GET(makeReq('test-secret'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.started).toBe(0)
    expect(data.concluded).toBe(0)
    expect(data.events.started).toHaveLength(0)
    expect(data.events.concluded).toHaveLength(0)
  })

  it('calls db.update with in_progress status', async () => {
    mockReturning.mockResolvedValue([])
    await GET(makeReq('test-secret'))
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockUpdateSet).toHaveBeenCalledWith({ status: 'in_progress' })
  })
})
