import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Anthropic before importing the route ───────────────────────────────
// vi.hoisted ensures mockCreate is available inside the vi.mock factory,
// which runs before any top-level variable declarations.

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate }
  },
}))

// Import route after mock is in place
import { POST } from '@/app/api/ritual/infer/route'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(body: unknown) {
  return new Request('http://localhost/api/ritual/infer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_INFERENCE = {
  activityType: 'ski',
  theme: 'circuit',
  tagline: 'No brakes, all glory',
  awards: ['Top Gun', 'Crash Dummy'],
  slug: 'mavericks',
}

function mockClaudeText(text: string) {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text }],
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/ritual/infer', () => {
  beforeEach(() => mockCreate.mockReset())

  it('returns valid inference from clean JSON response', async () => {
    mockClaudeText(JSON.stringify(VALID_INFERENCE))
    const res = await POST(makeReq({ name: 'Mavericks' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toMatchObject(VALID_INFERENCE)
  })

  it('strips markdown code fences (```json ... ``` wrapping)', async () => {
    mockClaudeText('```json\n' + JSON.stringify(VALID_INFERENCE) + '\n```')
    const res = await POST(makeReq({ name: 'Mavericks' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slug).toBe('mavericks')
  })

  it('strips plain code fences (``` ... ``` without language tag)', async () => {
    mockClaudeText('```\n' + JSON.stringify(VALID_INFERENCE) + '\n```')
    const res = await POST(makeReq({ name: 'Mavericks' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.activityType).toBe('ski')
  })

  it('returns 400 for a name that is too short', async () => {
    const res = await POST(makeReq({ name: 'A' }))
    expect(res.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 400 for a missing name', async () => {
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 500 when Claude returns unparseable text', async () => {
    mockClaudeText('Sorry, I cannot help with that.')
    const res = await POST(makeReq({ name: 'Mavericks' }))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Inference failed')
  })

  it('includes all required inference fields in response', async () => {
    mockClaudeText(JSON.stringify(VALID_INFERENCE))
    const res = await POST(makeReq({ name: 'Mavericks' }))
    const data = await res.json()
    expect(data).toHaveProperty('activityType')
    expect(data).toHaveProperty('theme')
    expect(data).toHaveProperty('tagline')
    expect(data).toHaveProperty('awards')
    expect(data).toHaveProperty('slug')
    expect(Array.isArray(data.awards)).toBe(true)
  })
})
