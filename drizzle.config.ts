import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

config({ path: '.env.local' })

export default {
  schema: './db/schema',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
