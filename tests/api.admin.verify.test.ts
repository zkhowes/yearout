import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn())

vi.mock('@/auth', () => ({ auth: mockAuth }))

import { POST } from '@/app/api/admin/verify/route'

// ── Helpers ───────────────────────────────────────────────────────────────────
const CORRECT_PASSWORD = 'secret123'

function makeReq(body: unknown) {
  return new Request('http://localhost/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('POST /api/admin/verify', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    process.env.ADMIN_PASSWORD = CORRECT_PASSWORD
  })

  it('returns 401 when no session', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeReq({ password: CORRECT_PASSWORD }))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 403 when password is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(makeReq({}))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('Invalid password')
  })

  it('returns 403 when password is wrong', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(makeReq({ password: 'wrongpassword' }))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('Invalid password')
  })

  it('returns 200 with { ok: true } when correct password', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(makeReq({ password: CORRECT_PASSWORD }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it('sets admin_session cookie on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(makeReq({ password: CORRECT_PASSWORD }))
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('admin_session=granted')
  })

  it('does not set admin_session cookie on failure', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(makeReq({ password: 'wrong' }))
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toBeNull()
  })
})
