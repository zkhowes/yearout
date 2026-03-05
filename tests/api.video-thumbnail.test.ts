import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockFetch = vi.hoisted(() => vi.fn())

vi.stubGlobal('fetch', mockFetch)

import { GET } from '@/app/api/video-thumbnail/route'

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeReq(url?: string) {
  const searchParams = new URLSearchParams()
  if (url) searchParams.set('url', url)
  return new NextRequest(`http://localhost/api/video-thumbnail?${searchParams}`)
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('GET /api/video-thumbnail', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns 400 when url param is missing', async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Missing url param')
  })

  it('returns YouTube thumbnail for youtube.com URL', async () => {
    const res = await GET(makeReq('https://www.youtube.com/watch?v=abc123'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.thumbnailUrl).toBe('https://img.youtube.com/vi/abc123/maxresdefault.jpg')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns YouTube thumbnail for youtu.be URL', async () => {
    const res = await GET(makeReq('https://youtu.be/xyz789'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.thumbnailUrl).toBe('https://img.youtube.com/vi/xyz789/maxresdefault.jpg')
  })

  it('returns Vimeo thumbnail via oEmbed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ thumbnail_url: 'https://i.vimeocdn.com/video/123_640x360.jpg' }),
    })
    const res = await GET(makeReq('https://vimeo.com/123456'))
    expect(res.status).toBe(200)
    const data = await res.json()
    // Should strip size suffix for high res
    expect(data.thumbnailUrl).toBe('https://i.vimeocdn.com/video/123.jpg')
  })

  it('returns Vimeo thumbnail for URL with hash', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ thumbnail_url: 'https://i.vimeocdn.com/video/456_1280x720.jpg' }),
    })
    const res = await GET(makeReq('https://vimeo.com/789/abc123'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.thumbnailUrl).toBeDefined()
  })

  it('returns null when Vimeo oEmbed fails', async () => {
    mockFetch.mockResolvedValue({ ok: false })
    const res = await GET(makeReq('https://vimeo.com/999999'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.thumbnailUrl).toBeNull()
  })

  it('returns null for unrecognized URL', async () => {
    const res = await GET(makeReq('https://example.com/video'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.thumbnailUrl).toBeNull()
  })

  it('handles Vimeo fetch throwing error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const res = await GET(makeReq('https://vimeo.com/123456'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.thumbnailUrl).toBeNull()
  })
})
