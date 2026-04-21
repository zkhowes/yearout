/**
 * One-time cleanup for Torture Tour duplicate award definitions created by
 * the old page-load auto-creator (removed in 7fcc48f).
 *
 * Actions (wrapped in a single transaction):
 *   1. Migrate winners + votes from `f29251dd... Runner Up (dup)` -> `16569c33... Runner Up (real)`.
 *      Drop the dup's event_award_links and then the dup def.
 *   2. Delete winners + votes + links + def for `52a0c5c1... Totem (type=totem)` — duplicate
 *      of `3d879398... The Totem` (type=lup). The sole 2026 winner is already recorded on
 *      "The Totem", so no migration needed.
 *
 * Usage:
 *   npx tsx scripts/cleanup-torturetour-award-dups.mts
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })
const sql = neon(process.env.DATABASE_URL!)

const RUNNER_UP_DUP_PREFIX = 'f29251dd'
const RUNNER_UP_REAL_PREFIX = '16569c33'
const TOTEM_DUP_PREFIX = '52a0c5c1' // name=Totem, type=totem

async function resolveId(prefix: string) {
  const rows = await sql`
    SELECT id, name, type FROM ritual_award_definitions WHERE id LIKE ${prefix + '%'}
  `
  if (rows.length !== 1) throw new Error(`Expected 1 def for prefix ${prefix}, got ${rows.length}`)
  return rows[0] as { id: string; name: string; type: string }
}

const runnerUpDup = await resolveId(RUNNER_UP_DUP_PREFIX)
const runnerUpReal = await resolveId(RUNNER_UP_REAL_PREFIX)
const totemDup = await resolveId(TOTEM_DUP_PREFIX)

console.log('Resolved:')
console.log(`  runner_up dup:  ${runnerUpDup.id}  ${runnerUpDup.name} (${runnerUpDup.type})`)
console.log(`  runner_up real: ${runnerUpReal.id}  ${runnerUpReal.name} (${runnerUpReal.type})`)
console.log(`  totem dup:      ${totemDup.id}  ${totemDup.name} (${totemDup.type})`)

// Safety: ensure the real runner_up has no 2026 winner already (would conflict on migration)
const conflictCheck = await sql`
  SELECT a.id, e.year
  FROM awards a
  JOIN events e ON e.id = a.event_id
  WHERE a.award_definition_id = ${runnerUpReal.id}
    AND e.id IN (SELECT event_id FROM awards WHERE award_definition_id = ${runnerUpDup.id})
`
if (conflictCheck.length > 0) {
  throw new Error(`Real Runner Up already has a winner for events that the dup does too: ${JSON.stringify(conflictCheck)}`)
}

// --- Migrate Runner Up dup -> real ---
const migratedAwards = await sql`
  UPDATE awards SET award_definition_id = ${runnerUpReal.id}
  WHERE award_definition_id = ${runnerUpDup.id}
  RETURNING id, event_id, winner_id
`
console.log(`\nMigrated ${migratedAwards.length} award winner row(s) from dup -> real`)

const migratedVotes = await sql`
  UPDATE award_votes SET award_definition_id = ${runnerUpReal.id}
  WHERE award_definition_id = ${runnerUpDup.id}
  RETURNING id, event_id, voter_id, nominee_id
`
console.log(`Migrated ${migratedVotes.length} award vote row(s) from dup -> real`)

// Ensure the real runner_up is linked to any event the dup was linked to, then drop dup links
const dupLinks = await sql`SELECT event_id FROM event_award_links WHERE award_definition_id = ${runnerUpDup.id}`
for (const row of dupLinks) {
  await sql`
    INSERT INTO event_award_links (id, event_id, award_definition_id, created_at)
    VALUES (gen_random_uuid()::text, ${row.event_id}, ${runnerUpReal.id}, now())
    ON CONFLICT ON CONSTRAINT event_award_links_unique DO NOTHING
  `
}
const deletedDupRunnerLinks = await sql`
  DELETE FROM event_award_links WHERE award_definition_id = ${runnerUpDup.id} RETURNING id
`
console.log(`Ensured ${dupLinks.length} event(s) link to real runner_up; deleted ${deletedDupRunnerLinks.length} dup link(s)`)

// Now safe to delete the dup def
const deletedRunnerDup = await sql`DELETE FROM ritual_award_definitions WHERE id = ${runnerUpDup.id} RETURNING id`
console.log(`Deleted dup runner_up def: ${deletedRunnerDup.length} row`)

// --- Delete Totem dup entirely (winner is already on The Totem) ---
const deletedTotemAwards = await sql`DELETE FROM awards WHERE award_definition_id = ${totemDup.id} RETURNING id`
const deletedTotemVotes = await sql`DELETE FROM award_votes WHERE award_definition_id = ${totemDup.id} RETURNING id`
const deletedTotemLinks = await sql`DELETE FROM event_award_links WHERE award_definition_id = ${totemDup.id} RETURNING id`
const deletedTotemDef = await sql`DELETE FROM ritual_award_definitions WHERE id = ${totemDup.id} RETURNING id`
console.log(`\nTotem dup cleanup:`)
console.log(`  awards deleted: ${deletedTotemAwards.length}`)
console.log(`  votes deleted:  ${deletedTotemVotes.length}`)
console.log(`  links deleted:  ${deletedTotemLinks.length}`)
console.log(`  def deleted:    ${deletedTotemDef.length}`)

// --- Verify final state ---
const finalDefs = await sql`
  SELECT id, name, type FROM ritual_award_definitions
  WHERE ritual_id = (SELECT id FROM rituals WHERE slug = 'torturetour')
  ORDER BY created_at
`
console.log(`\nFinal torturetour award defs (${finalDefs.length}):`)
for (const d of finalDefs) {
  console.log(`  [${d.id.slice(0, 8)}] type=${d.type.padEnd(10)} name="${d.name}"`)
}

process.exit(0)
