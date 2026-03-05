import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn())
const mockRedirect = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockUpdateWhere = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockUpdateSet = vi.hoisted(() => vi.fn(() => ({ where: mockUpdateWhere })))
const mockUpdate = vi.hoisted(() => vi.fn(() => ({ set: mockUpdateSet })))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/db', () => ({
  db: {
    update: mockUpdate,
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', name: 'name', image: 'image', nationality: 'nationality' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
}))

import { updateProfile } from '@/lib/profile-actions'

// ── Helpers ───────────────────────────────────────────────────────────────────
const SESSION = { user: { id: 'user-1' } }

function setupRedirectThrows() {
  mockRedirect.mockImplementation((url: string) => {
    throw Object.assign(new Error(`REDIRECT:${url}`), { url })
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('updateProfile', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockRedirect.mockReset()
    mockRevalidatePath.mockReset()
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
    await expect(updateProfile({ name: 'Test' })).rejects.toThrow('REDIRECT:/login')
  })

  it('updates name with trimmed value', async () => {
    mockAuth.mockResolvedValue(SESSION)
    await updateProfile({ name: '  John Doe  ' })
    const setArgs = mockUpdateSet.mock.calls[0][0]
    expect(setArgs.name).toBe('John Doe')
  })

  it('updates nationality with trimmed value', async () => {
    mockAuth.mockResolvedValue(SESSION)
    await updateProfile({ nationality: '  Canada  ' })
    const setArgs = mockUpdateSet.mock.calls[0][0]
    expect(setArgs.nationality).toBe('Canada')
  })

  it('updates image URL without trimming', async () => {
    mockAuth.mockResolvedValue(SESSION)
    const url = 'https://blob.vercel-storage.com/photo.jpg'
    await updateProfile({ image: url })
    const setArgs = mockUpdateSet.mock.calls[0][0]
    expect(setArgs.image).toBe(url)
  })

  it('does not include undefined fields in update', async () => {
    mockAuth.mockResolvedValue(SESSION)
    await updateProfile({ name: 'Test' })
    const setArgs = mockUpdateSet.mock.calls[0][0]
    expect(setArgs).not.toHaveProperty('image')
    expect(setArgs).not.toHaveProperty('nationality')
  })

  it('calls db.update for the authenticated user', async () => {
    mockAuth.mockResolvedValue(SESSION)
    await updateProfile({ name: 'Test' })
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('revalidates /profile path after update', async () => {
    mockAuth.mockResolvedValue(SESSION)
    await updateProfile({ name: 'Test' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile')
  })
})
