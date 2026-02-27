/**
 * Seeds the Torture Tour ritual with 17 years of real historical data (2009–2025).
 * Creates stub user records for all crew members (upserts by email).
 * Targets SEED_USER_EMAIL as the Sponsor (must exist — sign in once first).
 *
 * Usage:
 *   npm run db:seed
 *
 * Requirements:
 *   - SEED_USER_EMAIL must match an existing user in the users table
 *   - Run db:migrate first if tables don't exist yet
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { config } from 'dotenv'
import * as schema from '../db/schema'
import { eq } from 'drizzle-orm'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

// ── Crew definitions ──────────────────────────────────────────────────────────
// Nickname is the canonical identifier used throughout HISTORY below.
const CREW_DEFS = [
  { email: 'zkhowes@gmail.com',         name: 'Zach Howes',      nickname: 'Zkhowes' },
  { email: 'zack.ali@gmail.com',         name: 'Zack Ali',        nickname: 'Zeek' },
  { email: 'tim.t.peterson@gmail.com',   name: 'Tim Peterson',    nickname: 'Tim' },
  { email: 'rhettmillard@gmail.com',     name: 'Rhett Millard',   nickname: 'Cigarhett' },
  { email: 'alexhyap@gmail.com',         name: 'Alex Yap',        nickname: 'Yap' },
  { email: 'miguel.aguilar78@gmail.com', name: 'Miguel Aguilar',  nickname: 'Miho' },
  { email: 'raul.daniel@gmail.com',      name: 'Raul Daniel',     nickname: 'Raul' },
  { email: 'aguilar.carlos@gmail.com',   name: 'Carlos Aguilar',  nickname: 'LOS' },
]

// ── Historical event data ─────────────────────────────────────────────────────
// organizer / mvp / lup use the crew nickname as key.
// 2022 was a Co-MVP year — mvp is an array.
// NA years (2009–2012) have no awards — fields omitted.
const HISTORY: {
  year: number
  location: string
  mountains: string
  organizer: string
  mvp?: string | string[]
  lup?: string
}[] = [
  { year: 2009, location: 'South Lake Tahoe, California', mountains: 'Heavenly',             organizer: 'Zkhowes' },
  { year: 2010, location: 'South Lake Tahoe, California', mountains: 'Heavenly',             organizer: 'Zkhowes' },
  { year: 2011, location: 'South Lake Tahoe, California', mountains: 'Heavenly, Kirkwood',   organizer: 'Zeek' },
  { year: 2012, location: 'South Lake Tahoe, California', mountains: 'Heavenly',             organizer: 'Zkhowes' },
  { year: 2013, location: 'Snowbird, Utah',               mountains: 'Snowbird, Brighton',   organizer: 'Tim',      mvp: 'Cigarhett' },
  { year: 2014, location: 'Park City, Utah',              mountains: 'Big Basin, Park City', organizer: 'Tim',      mvp: 'Cigarhett' },
  { year: 2015, location: 'Eden, Utah',                   mountains: 'Powder Mountain',      organizer: 'Cigarhett', mvp: 'Miho' },
  { year: 2016, location: 'Skykomish, Washington',        mountains: 'Stevens Pass',         organizer: 'Zeek',     mvp: 'Zeek' },
  { year: 2017, location: 'Eden, Utah',                   mountains: 'Powder Mountain',      organizer: 'LOS',      mvp: 'Tim' },
  { year: 2018, location: 'Deming, Washington',           mountains: 'Mount Baker',          organizer: 'Zkhowes',  mvp: 'Cigarhett' },
  { year: 2019, location: 'Eden, Utah',                   mountains: 'Powder Mountain',      organizer: 'Miho',     mvp: 'Zkhowes' },
  { year: 2020, location: 'Big Sky, Montana',             mountains: 'Jackson Hole',         organizer: 'Tim',      mvp: 'Miho' },
  { year: 2021, location: 'Teton Village, Wyoming',       mountains: 'Jackson Hole',         organizer: 'Cigarhett', mvp: 'Cigarhett' },
  { year: 2022, location: 'Zurich, Switzerland',          mountains: 'Dolder, Titlis',       organizer: 'Tim',      mvp: ['Tim', 'Zkhowes'] },
  { year: 2023, location: 'South Lake Tahoe, Nevada',     mountains: 'Squaw, Heavenly',      organizer: 'Cigarhett', mvp: 'LOS',      lup: 'Yap' },
  { year: 2024, location: 'New Mexico',                   mountains: 'Taos',                 organizer: 'LOS',      mvp: 'Zkhowes',  lup: 'Raul' },
  { year: 2025, location: 'British Columbia, Canada',     mountains: 'Whistler',             organizer: 'Zeek',     mvp: 'Cigarhett', lup: 'Tim' },
]

async function seed() {
  const sponsorEmail = process.env.SEED_USER_EMAIL
  if (!sponsorEmail) {
    console.error('SEED_USER_EMAIL not set in .env.local')
    process.exit(1)
  }

  // ── Find sponsor user (must have signed in at least once) ──────────────────
  const sponsorUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, sponsorEmail),
  })
  if (!sponsorUser) {
    console.error(`No user found with email: ${sponsorEmail}`)
    console.error('Sign in at least once before running the seed script.')
    process.exit(1)
  }
  console.log(`Seeding as sponsor: ${sponsorUser.name} (${sponsorUser.email})`)

  // ── Guard: skip if already seeded ─────────────────────────────────────────
  const existing = await db.query.rituals.findFirst({
    where: (r, { eq }) => eq(r.slug, 'torturetour'),
  })
  if (existing) {
    console.log('Torture Tour already exists — skipping.')
    console.log('Run db:reset first if you want to re-seed from scratch.')
    process.exit(0)
  }

  // ── Upsert crew users ──────────────────────────────────────────────────────
  // For crew who haven't signed in yet we create stub records.
  // The sponsor already exists — we just look them up.
  console.log('\nUpserting crew users...')
  const crewByNickname: Record<string, string> = {} // nickname → userId

  for (const c of CREW_DEFS) {
    if (c.email === sponsorEmail) {
      // Sponsor already exists — use their real record
      crewByNickname[c.nickname] = sponsorUser.id
      console.log(`  ✓ ${c.nickname} → existing user (${sponsorUser.email})`)
      continue
    }

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, c.email),
    })

    if (existing) {
      crewByNickname[c.nickname] = existing.id
      console.log(`  ✓ ${c.nickname} → existing user (${c.email})`)
    } else {
      const newId = crypto.randomUUID()
      await db.insert(schema.users).values({
        id: newId,
        name: c.name,
        email: c.email,
        createdAt: new Date(),
      })
      crewByNickname[c.nickname] = newId
      console.log(`  + ${c.nickname} → created stub user (${c.email})`)
    }
  }

  // ── Create ritual ──────────────────────────────────────────────────────────
  const ritualId = crypto.randomUUID()
  const inviteToken = crypto.randomUUID()

  await db.insert(schema.rituals).values({
    id: ritualId,
    name: 'The Torture Tour',
    slug: 'torturetour',
    sponsorId: sponsorUser.id,
    activityType: 'ski',
    theme: 'circuit',
    tagline: 'No powder wasted.',
    foundingYear: '2009',
    bylaws: 'First chair. Last run. No excuses.',
    inviteToken,
    createdAt: new Date(),
  })
  console.log('\nCreated ritual: The Torture Tour (torturetour)')

  // ── Award definitions: MVP + The Totem (LUP) ─────────────────────────────
  const mvpDefId = crypto.randomUUID()
  const lupDefId = crypto.randomUUID()

  await db.insert(schema.ritualAwardDefinitions).values([
    {
      id: mvpDefId,
      ritualId,
      name: 'MVP',
      label: 'Most Valuable Player',
      type: 'mvp',
      createdAt: new Date(),
    },
    {
      id: lupDefId,
      ritualId,
      name: 'The Totem',
      label: 'Least Useful Player',
      type: 'lup',
      createdAt: new Date(),
    },
  ])
  console.log('Created award definitions: MVP, The Totem')

  // ── Add all crew as ritual members (Core Crew) ─────────────────────────────
  console.log('\nAdding Core Crew members...')
  for (const c of CREW_DEFS) {
    const userId = crewByNickname[c.nickname]
    await db.insert(schema.ritualMembers).values({
      id: crypto.randomUUID(),
      ritualId,
      userId,
      role: c.email === sponsorEmail ? 'sponsor' : 'crew_member',
      isCoreCrewe: true,
      nicknameOverride: c.nickname,
      joinedAt: new Date(2009, 0, 1), // founding date for all core crew
    })
    console.log(`  + ${c.nickname}`)
  }

  // ── Seed historical events ─────────────────────────────────────────────────
  console.log('\nSeeding 17 years of events...')
  for (const h of HISTORY) {
    const eventId = crypto.randomUUID()
    const organizerId = crewByNickname[h.organizer]
    if (!organizerId) {
      console.warn(`  ⚠ Unknown organizer nickname: ${h.organizer} (year ${h.year}) — skipping organizerId`)
    }

    await db.insert(schema.events).values({
      id: eventId,
      ritualId,
      organizerId: organizerId ?? null,
      name: `Torture Tour ${h.year}`,
      year: h.year,
      location: h.location,
      mountains: h.mountains,
      status: 'closed',
      sealedAt: new Date(h.year, 3, 1), // approximate seal date: April of that year
      createdAt: new Date(h.year, 0, 1),
    })

    // Awards
    const mvpNicknames = h.mvp
      ? Array.isArray(h.mvp) ? h.mvp : [h.mvp]
      : []

    for (const mvpNickname of mvpNicknames) {
      const winnerId = crewByNickname[mvpNickname]
      if (!winnerId) {
        console.warn(`  ⚠ Unknown MVP nickname: ${mvpNickname} (year ${h.year})`)
        continue
      }
      await db.insert(schema.awards).values({
        id: crypto.randomUUID(),
        eventId,
        awardDefinitionId: mvpDefId,
        winnerId,
        createdAt: new Date(h.year, 3, 1),
      })
    }

    if (h.lup) {
      const lupId = crewByNickname[h.lup]
      if (!lupId) {
        console.warn(`  ⚠ Unknown Totem nickname: ${h.lup} (year ${h.year})`)
      } else {
        await db.insert(schema.awards).values({
          id: crypto.randomUUID(),
          eventId,
          awardDefinitionId: lupDefId,
          winnerId: lupId,
          createdAt: new Date(h.year, 3, 1),
        })
      }
    }

    const mvpLabel = Array.isArray(h.mvp) ? h.mvp.join(' & ') : (h.mvp ?? 'N/A')
    const lupLabel = h.lup ?? '—'
    console.log(`  ${h.year}  ${h.location.padEnd(35)}  MVP: ${mvpLabel.padEnd(20)} Totem: ${lupLabel}`)
  }

  console.log('\nSeed complete!')
  console.log(`Ritual slug:   torturetour`)
  console.log(`Invite token:  ${inviteToken}`)
  console.log(`\nVisit: http://localhost:3003/torturetour`)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
