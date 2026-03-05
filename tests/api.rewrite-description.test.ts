import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn())
const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate }
  },
}))

import { POST } from '@/app/api/ritual/rewrite-description/route'

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeReq(body: unknown) {
  return new Request('http://localhost/api/ritual/rewrite-description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

function mockClaudeText(text: string) {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text }],
  })
}

const VALID_BODY = {
  description: 'We go skiing every year in the mountains.',
  ritualName: 'Torture Tour',
  activityType: 'ski',
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('POST /api/ritual/rewrite-description', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockCreate.mockReset()
  })

  it('returns 401 when no session', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeReq(VALID_BODY))
    expect(res.status).toBe(401)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 400 when description is too short', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(makeReq({ ...VALID_BODY, description: 'Hi' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when description is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(makeReq({ ritualName: 'Test', activityType: 'ski' }))
    expect(res.status).toBe(400)
  })

  it('returns rewritten text from Claude', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockClaudeText('An epic tale of skiing and glory.')
    const res = await POST(makeReq(VALID_BODY))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.rewritten).toBe('An epic tale of skiing and glory.')
  })

  it('truncates long descriptions to 2000 chars before sending to Claude', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockClaudeText('Rewritten version.')
    const longDesc = 'A'.repeat(5000)
    await POST(makeReq({ ...VALID_BODY, description: longDesc }))
    // Verify the prompt sent to Claude was truncated
    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt.length).toBeLessThan(5000)
  })

  it('falls back to original description when Claude returns no text', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockCreate.mockResolvedValue({ content: [{ type: 'tool_use', id: '1', name: 'x', input: {} }] })
    const res = await POST(makeReq(VALID_BODY))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.rewritten).toBe(VALID_BODY.description)
  })

  it('passes timeout to Anthropic client', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockClaudeText('Rewritten.')
    await POST(makeReq(VALID_BODY))
    expect(mockCreate.mock.calls[0][1]).toEqual({ timeout: 10_000 })
  })
})
