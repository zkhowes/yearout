import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())
const mockAuth = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate }
  },
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))

import { POST } from '@/app/api/ritual/parse-history/route'

function makeReq(body: unknown) {
  return new Request('http://localhost/api/ritual/parse-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockClaudeText(text: string) {
  mockCreate.mockResolvedValue({ content: [{ type: 'text', text }] })
}

describe('POST /api/ritual/parse-history', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockAuth.mockReset()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
  })

  it('returns 401 when no session', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeReq({ ritualName: 'TT', freeform: '2009 Tahoe' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when freeform is empty', async () => {
    const res = await POST(makeReq({ ritualName: 'TT', freeform: '' }))
    expect(res.status).toBe(400)
  })

  it('parses clean JSON into structured rows', async () => {
    mockClaudeText(
      JSON.stringify({
        rows: [
          { year: 2009, location: 'South Lake Tahoe, CA', mountains: 'Heavenly', memory: 'food poisoning' },
          { year: 2010, location: 'South Lake Tahoe, CA' },
        ],
      }),
    )
    const res = await POST(makeReq({ ritualName: 'TT', freeform: '2009 tahoe...' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.rows).toHaveLength(2)
    expect(data.rows[0]).toMatchObject({
      year: 2009,
      location: 'South Lake Tahoe, CA',
      mountains: 'Heavenly',
      memory: 'food poisoning',
    })
    expect(data.rows[1].mountains).toBeUndefined()
  })

  it('strips markdown fences', async () => {
    mockClaudeText('```json\n' + JSON.stringify({ rows: [{ year: 2020, location: 'Aspen' }] }) + '\n```')
    const res = await POST(makeReq({ ritualName: 'TT', freeform: 'foo' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.rows[0].year).toBe(2020)
  })

  it('extracts JSON when wrapped in preamble', async () => {
    mockClaudeText('Here is the parsed data: ' + JSON.stringify({ rows: [{ year: 2021, location: 'Jackson' }] }))
    const res = await POST(makeReq({ ritualName: 'TT', freeform: 'foo' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.rows[0].location).toBe('Jackson')
  })

  it('drops rows with invalid year', async () => {
    mockClaudeText(
      JSON.stringify({
        rows: [
          { year: 1899, location: 'too old' },
          { year: 9999, location: 'too future' },
          { year: 'not a number', location: 'nope' },
          { year: 2020, location: 'OK' },
        ],
      }),
    )
    const res = await POST(makeReq({ ritualName: 'TT', freeform: 'foo' }))
    const data = await res.json()
    expect(data.rows).toHaveLength(1)
    expect(data.rows[0].year).toBe(2020)
  })

  it('drops rows missing location', async () => {
    mockClaudeText(
      JSON.stringify({
        rows: [
          { year: 2020 },
          { year: 2021, location: '' },
          { year: 2022, location: 'Aspen' },
        ],
      }),
    )
    const res = await POST(makeReq({ ritualName: 'TT', freeform: 'foo' }))
    const data = await res.json()
    expect(data.rows).toHaveLength(1)
    expect(data.rows[0].year).toBe(2022)
  })

  it('returns 500 when Claude response is unparseable', async () => {
    mockClaudeText('Sorry, I cannot help with that.')
    const res = await POST(makeReq({ ritualName: 'TT', freeform: 'foo' }))
    expect(res.status).toBe(500)
  })
})
