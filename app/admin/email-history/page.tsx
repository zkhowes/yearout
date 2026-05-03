import { db } from '@/db'
import { callSends, rituals, events } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EmailHistoryPage() {
  const rows = await db
    .select({
      id: callSends.id,
      ritualId: callSends.ritualId,
      eventId: callSends.eventId,
      stage: callSends.stage,
      variant: callSends.variant,
      recipients: callSends.recipients,
      resendMessageId: callSends.resendMessageId,
      status: callSends.status,
      triggeredBy: callSends.triggeredBy,
      sentAt: callSends.sentAt,
      ritualName: rituals.name,
      ritualSlug: rituals.slug,
      eventName: events.name,
      eventYear: events.year,
    })
    .from(callSends)
    .leftJoin(rituals, eq(callSends.ritualId, rituals.id))
    .leftJoin(events, eq(callSends.eventId, events.id))
    .orderBy(desc(callSends.sentAt))
    .limit(200)

  return (
    <div>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>Email History</h1>
      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
        Latest 200 entries from <code>call_sends</code>. Anything before the email pipeline shipped will show stage but no message ID.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f2937', textAlign: 'left', color: '#6b7280', textTransform: 'uppercase', fontSize: '10px' }}>
              <th style={th}>Sent</th>
              <th style={th}>Ritual</th>
              <th style={th}>Event</th>
              <th style={th}>Stage</th>
              <th style={th}>Variant</th>
              <th style={th}>Recipients</th>
              <th style={th}>Status</th>
              <th style={th}>Source</th>
              <th style={th}>Resend ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ ...td, color: '#6b7280', textAlign: 'center', padding: '24px' }}>
                  No emails sent yet. Use The Call tab to send one.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const recips = Array.isArray(r.recipients) ? r.recipients : []
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={td}>{r.sentAt?.toISOString().slice(0, 16).replace('T', ' ') ?? '—'}</td>
                    <td style={td}>
                      {r.ritualSlug ? (
                        <Link href={`/${r.ritualSlug}`} style={linkStyle}>
                          {r.ritualName}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={td}>{r.eventName ? `${r.eventName} (${r.eventYear})` : '—'}</td>
                    <td style={td}>{r.stage}</td>
                    <td style={td}>{r.variant ?? '—'}</td>
                    <td style={td}>
                      <span title={recips.join(', ')}>
                        {recips.length} {recips.length === 1 ? 'addr' : 'addrs'}
                      </span>
                    </td>
                    <td style={td}>{r.status ?? '—'}</td>
                    <td style={td}>{r.triggeredBy ?? '—'}</td>
                    <td style={{ ...td, fontSize: '10px', color: '#6b7280' }}>
                      {r.resendMessageId?.slice(0, 12) ?? '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 'normal' }
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'top' }
const linkStyle: React.CSSProperties = { color: '#a3e635', textDecoration: 'none' }
