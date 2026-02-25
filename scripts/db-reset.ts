/**
 * Drops all tables and custom types in the Neon database.
 * Safe to run in development — never run in production.
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function reset() {
  console.log('Dropping all tables and types...')

  await sql`DROP SCHEMA public CASCADE`
  await sql`CREATE SCHEMA public`
  await sql`GRANT ALL ON SCHEMA public TO PUBLIC`

  console.log('Database reset complete.')
}

reset().catch((err) => {
  console.error(err)
  process.exit(1)
})
