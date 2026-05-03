import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())
const mockAuth = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate }
  },
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))

import { POST } from '@/app/api/ritual/skald-converse/route'

function makeReq(body: unknown) {
  return new Request('http://localhost/api/ritual/skald-converse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockClaudeText(text: string) {
  mockCreate.mockResolvedValue({ content: [{ type: 'text', text }] })
}

describe('POST /api/ritual/skald-converse', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockAuth.mockReset()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
  })

  it('returns 401 when no session', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeReq({ messages: [], phase: 'activity' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when phase is missing', async () => {
    const res = await POST(makeReq({ messages: [] }))
    expect(res.status).toBe(400)
  })

  it('returns assistantText for the activity phase', async () => {
    mockClaudeText('I hear you. How long has this been going?')
    const res = await POST(
      makeReq({
        messages: [{ role: 'user', content: 'we ski every winter' }],
        phase: 'activity',
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.assistantText).toContain('How long')
    expect(data.candidateNames).toBeUndefined()
    expect(data.done).toBeUndefined()
  })

  it('extracts candidate names from the phrase phase', async () => {
    mockClaudeText(
      'A nickname earned in suffering.\nSome names that whisper themselves: The Long Cold, The Reckoning, The Annual',
    )
    const res = await POST(
      makeReq({
        messages: [
          { role: 'assistant', content: 'opening' },
          { role: 'user', content: 'we ski 16 years' },
          { role: 'assistant', content: 'turn 2' },
          { role: 'user', content: 'we call it the torture tour' },
        ],
        phase: 'phrase',
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.candidateNames).toEqual(['The Long Cold', 'The Reckoning', 'The Annual'])
    expect(data.done).toBe(true)
  })

  it('falls back gracefully when Anthropic throws', async () => {
    mockCreate.mockRejectedValue(new Error('boom'))
    const res = await POST(
      makeReq({
        messages: [{ role: 'user', content: 'test' }],
        phase: 'years',
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(typeof data.assistantText).toBe('string')
    expect(data.assistantText.length).toBeGreaterThan(0)
  })

  it('falls back with candidate names for the phrase phase', async () => {
    mockCreate.mockRejectedValue(new Error('boom'))
    const res = await POST(
      makeReq({
        messages: [{ role: 'user', content: 'test' }],
        phase: 'phrase',
      }),
    )
    const data = await res.json()
    expect(Array.isArray(data.candidateNames)).toBe(true)
    expect(data.candidateNames.length).toBeGreaterThan(0)
    expect(data.done).toBe(true)
  })

  it('uses prompt caching for the system prompt', async () => {
    mockClaudeText('ok')
    await POST(
      makeReq({
        messages: [{ role: 'user', content: 'hi' }],
        phase: 'activity',
      }),
    )
    const call = mockCreate.mock.calls[0][0] as {
      system: { type: string; text: string; cache_control?: { type: string } }[]
    }
    expect(Array.isArray(call.system)).toBe(true)
    expect(call.system[0].cache_control?.type).toBe('ephemeral')
  })
})
