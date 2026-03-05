import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn())
const mockPut = vi.hoisted(() => vi.fn())

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('@vercel/blob', () => ({ put: mockPut }))

import { POST } from '@/app/api/upload/route'

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeReq(file?: File) {
  const formData = new FormData()
  if (file) formData.append('file', file)
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    body: formData,
  }) as any
}

function makeFile(name: string, size: number, type = 'image/jpeg') {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('POST /api/upload', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockPut.mockReset()
    mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/test.jpg' })
  })

  it('returns 401 when no session', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeReq(makeFile('test.jpg', 100)))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no file provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(makeReq())
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('No file provided')
  })

  it('returns 400 when file exceeds 10MB', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const bigFile = makeFile('big.jpg', 11 * 1024 * 1024)
    const res = await POST(makeReq(bigFile))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('too large')
  })

  it('returns 400 for non-image file types', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const txtFile = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const res = await POST(makeReq(txtFile))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('image')
  })

  it('accepts image with correct MIME type', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(makeReq(makeFile('photo.jpg', 1024)))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.url).toBeDefined()
    expect(mockPut).toHaveBeenCalled()
  })

  it('accepts image by extension when MIME is empty', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const file = new File([new ArrayBuffer(100)], 'photo.heic', { type: '' })
    const res = await POST(makeReq(file))
    expect(res.status).toBe(200)
  })

  it('returns 500 when blob upload fails', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockPut.mockRejectedValue(new Error('Blob service unavailable'))
    const res = await POST(makeReq(makeFile('photo.jpg', 1024)))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('Upload failed')
  })
})
