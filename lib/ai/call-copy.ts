// AI copy generation for The Call email variants.
// Each function takes a content object from lib/call/content.ts and returns
// {subject, headline, body} — short, dramatic, on-theme. Cached per-send via
// callSends.aiCopy so we never re-run for the same send.

import Anthropic from '@anthropic-ai/sdk'
import type {
  CallContent,
  Stage1ColdStartContent,
  Stage1OngoingContent,
  Stage2VoteContent,
  Stage3ConfirmedContent,
  Stage3aCommitContent,
  Stage3bPackListContent,
  Stage4InTripContent,
  Stage5CloseoutContent,
  Stage6MythologyContent,
} from '@/lib/call/content'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-haiku-4-5-20251001'

export interface AiCopy {
  subject: string
  headline: string
  body: string
  /** Raw model response — useful for the admin debug panel. */
  rawText: string
  /** Token usage. */
  inputTokens: number
  outputTokens: number
}

const SYSTEM_PROMPT = `You write copy for "The Call" — a transactional email from yearout, an app that turns recurring group adventure trips into mythology.

Facts contract (CRITICAL — overrides everything else):
- You may ONLY reference proper nouns (people, places, years, events, awards) that appear verbatim in the Context block.
- NEVER invent prior chapters, locations, or years. NEVER reference a year, place, or person not given to you.
- If the Context provides no prior chapters, write atemporally — no "remember when," no past locations, no past years.
- If a field is "unknown" or missing, omit it entirely. Do not guess.
- Treat every name, location, and year in the Context as the only valid pool. Outside that pool, stay generic ("the crew," "last year," "the mountain").

Voice rules:
- DELIGHT, never guilt. Tone is excitement and nostalgia, never finger-wagging.
- Punchy. Short sentences. Earned drama.
- Carpe diem energy when calling people to action.
- Write as if you are a member of the crew, not a corporation.
- No emojis ever. No exclamation marks unless truly earned (max 1 per email).
- Subject lines under 60 chars, headlines under 70 chars.

Output format: STRICT JSON only, no preamble:
{ "subject": "...", "headline": "...", "body": "..." }

Body is plain prose, 2-4 short sentences. No markdown, no HTML.`

async function callHaiku(userPrompt: string): Promise<AiCopy> {
  const message = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 320,
      temperature: 0.6,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    },
    { timeout: 15_000 }
  )

  const rawText =
    message.content[0]?.type === 'text' ? message.content[0].text : ''

  // Extract JSON — model sometimes wraps in fences despite the rule
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

  return {
    subject: typeof parsed.subject === 'string' ? parsed.subject.trim() : '',
    headline: typeof parsed.headline === 'string' ? parsed.headline.trim() : '',
    body: typeof parsed.body === 'string' ? parsed.body.trim() : '',
    rawText,
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
  }
}

/* ============================================================
 * Per-variant copy generators
 * ============================================================ */

async function copyStage1ColdStart(c: Stage1ColdStartContent): Promise<AiCopy> {
  return callHaiku(`Generate copy for a Stage 1 "Cold Start" Call email.

Context:
- Ritual name: ${c.ritual.name}
- Activity: ${c.ritual.activityType}
- Theme: ${c.ritual.theme}
- Tagline: ${c.ritual.tagline ?? 'none'}
- This crew has run zero events together yet — this is the first nudge.

Goal: Get the crew excited to plan the inaugural trip. Reference the activity. Use carpe diem energy. The CTA in the email is "Plan the trip →".

Example tone (for activity=ski): "The mountains don't care about your calendar. Pick a week. Pick a peak."`)
}

async function copyStage1Ongoing(c: Stage1OngoingContent): Promise<AiCopy> {
  const lastBits = c.lastEvent
    ? `Last event: ${c.lastEvent.name} (${c.lastEvent.year}) at ${c.lastEvent.location ?? 'unknown'}`
    : 'No prior events on file.'
  const mvpBit = c.lastMvp
    ? `Last MVP: ${c.lastMvp.displayName} (won "${c.lastMvp.awardName}")`
    : ''
  return callHaiku(`Generate copy for a Stage 1 "Ongoing" Call email — pure nostalgia bomb.

Context:
- Ritual name: ${c.ritual.name}
- Activity: ${c.ritual.activityType}
- Theme: ${c.ritual.theme}
- Years run: ${c.ritual.yearsRun}
- Founding year: ${c.ritual.foundingYear ?? 'unknown'}
- ${lastBits}
- ${mvpBit}

Goal: Get the crew nostalgic about the last trip and itching to plan the next one. Reference the MVP if provided ("Can [name] repeat?"). Reference the location/year. CTA is "Plan the next chapter →".`)
}

async function copyStage2Vote(c: Stage2VoteContent): Promise<AiCopy> {
  return callHaiku(`Generate copy for a Stage 2 "Vote" Call email.

Context:
- Ritual: ${c.event.ritual.name}
- Year: ${c.event.year}
- Date options: ${c.dateOptionsCount}
- Location options: ${c.locationOptionsCount}
- Votes cast so far: ${c.votesSoFar}

Goal: Voting is open. Get people to weigh in fast. Tone: this is real, show up. CTA is "Cast your votes →".`)
}

async function copyStage3Confirmed(c: Stage3ConfirmedContent): Promise<AiCopy> {
  return callHaiku(`Generate copy for a Stage 3 "Confirmed" Call email — the ceremonial moment.

Context:
- Event name: ${c.event.name}
- Location: ${c.event.location}
- Dates: ${c.event.startDate?.toDateString()} to ${c.event.endDate?.toDateString()}
- Crew committed so far: ${c.committedCount} of ${c.totalAttendees}
${c.airportHint ? `- Airport hint: ${c.airportHint}` : ''}

Goal: It's official. The trip is locked. Drop everything. CTA is "Lock in your spot →" (commitment board).
Tone: ceremonial, big moment, but warm. Like a horn going off.`)
}

async function copyStage3aCommit(c: Stage3aCommitContent): Promise<AiCopy> {
  const others = c.committedNames.slice(0, 5).join(', ')
  return callHaiku(`Generate copy for a Stage 3a "Commit Reminder" — sent to ONE person who hasn't committed yet.

Context:
- Recipient first name: ${c.recipient.name.split(' ')[0]}
- Event: ${c.event.name} at ${c.event.location}
- Already committed: ${others || 'no one yet'}

Goal: Personal nudge. Soft, not guilt-trippy. Saving them a seat. CTA is "Commit →".
Address them by first name in the body. Reference who has committed.`)
}

async function copyStage3bPackList(c: Stage3bPackListContent): Promise<AiCopy> {
  return callHaiku(`Generate copy for a Stage 3b "Pack List" reminder — ${c.daysUntil} days before the trip.

Context:
- Event: ${c.event.name} at ${c.event.location}
- Activity: ${c.event.ritual.activityType}
- Days until trip: ${c.daysUntil}
- Top items on the pack list: ${c.packListItems.slice(0, 3).join(', ')}

Goal: Excited last-mile prep nudge. Highlight the most important item (passport if international, or the activity-essential gear). Tone: friendly, not naggy. CTA is "Review your pack list →".`)
}

async function copyStage4InTrip(c: Stage4InTripContent): Promise<AiCopy> {
  const themeBit = c.todayThemeName ? `Today's theme: ${c.todayThemeName}` : ''
  const expBit =
    c.expenseRunningTotalCents > 0
      ? `Running expenses: $${(c.expenseRunningTotalCents / 100).toFixed(0)}`
      : ''
  return callHaiku(`Generate copy for a Stage 4 "In-Trip Pulse" — sent during the trip itself.

Context:
- Event: ${c.event.name}
- Day ${c.dayOfTrip} of ${c.totalDays}
- ${themeBit}
- ${expBit}
- Lore entries so far: ${c.recentLoreCount}

Goal: Get someone to drop a memory or log an expense. Live. Energetic. CTA is "Drop a memory →" or "Add an expense →".`)
}

async function copyStage5Closeout(c: Stage5CloseoutContent): Promise<AiCopy> {
  const podium = c.awardsPodium
    .map((p) => `${p.awardName}: ${p.winner ?? 'TBD'}`)
    .join(' · ')
  const balanceBit =
    c.recipientBalanceCents == null
      ? ''
      : c.recipientBalanceCents > 0
        ? `Owed back: $${(c.recipientBalanceCents / 100).toFixed(0)}`
        : c.recipientBalanceCents < 0
          ? `Owes: $${Math.abs(c.recipientBalanceCents / 100).toFixed(0)}`
          : 'Settled up'
  return callHaiku(`Generate copy for a Stage 5 "Closeout" Call — event just concluded.

Context:
- Event: ${c.event.name}
- Awards podium: ${podium || 'pending votes'}
- ${balanceBit}

Goal: Trip's over, time to settle expenses, vote on awards if pending, and add any last lore. Nostalgic. "Never too late to add a memory." CTA depends — settle, vote, or add lore.`)
}

async function copyStage6Mythology(c: Stage6MythologyContent): Promise<AiCopy> {
  const priorList =
    c.priorChapters.length > 0
      ? c.priorChapters
          .slice(0, 6)
          .map((p) => `${p.location ?? 'unknown'} '${String(p.year).slice(-2)}`)
          .join(', ')
      : 'NONE — this is the first chapter on record. Do not reference any prior year or location.'

  return callHaiku(`Generate copy for a Stage 6 "Mythology" Call — sent ~30 days after a trip closed.

Context:
- Ritual: ${c.ritual.name}
- Just-finished event: ${c.recapEvent.name} (${c.recapEvent.year}) at ${c.recapEvent.location ?? 'unknown'}
- MVP: ${c.recapEvent.mvpName ?? 'TBD'}
- Years the ritual has run: ${c.ritual.yearsRun}
- Prior chapters (the ONLY past locations/years you may reference): ${priorList}

Goal: Fold the chapter into the legend. Soft kickoff to next year. Tone: warm, retrospective, then forward-looking. CTA is "Start next year →".

Hard rules for this email:
- If you reference a past chapter, pick one or two from the "Prior chapters" list verbatim. Do not invent any other year, place, or trip.
- If "Prior chapters" is NONE, do not reference any specific past year or location at all.`)
}

/* ============================================================
 * Dispatcher
 * ============================================================ */

export async function generateCallCopy(content: CallContent): Promise<AiCopy> {
  switch (content.variant) {
    case 'stage1_cold_start':
      return copyStage1ColdStart(content)
    case 'stage1_ongoing':
      return copyStage1Ongoing(content)
    case 'stage2_vote':
      return copyStage2Vote(content)
    case 'stage3_confirmed':
      return copyStage3Confirmed(content)
    case 'stage3a_commit':
      return copyStage3aCommit(content)
    case 'stage3b_pack_list':
      return copyStage3bPackList(content)
    case 'stage4_in_trip':
      return copyStage4InTrip(content)
    case 'stage5_closeout':
      return copyStage5Closeout(content)
    case 'stage6_mythology':
      return copyStage6Mythology(content)
  }
}

/** Cheap fallback when the API is down or returns garbage. */
export function fallbackCopy(content: CallContent): AiCopy {
  const ritualName =
    'ritual' in content ? content.ritual.name : content.event.ritual.name
  return {
    subject: `${ritualName} — The Call`,
    headline: `${ritualName}`,
    body: 'Open the app to see what is going on with the ritual.',
    rawText: '[fallback]',
    inputTokens: 0,
    outputTokens: 0,
  }
}
