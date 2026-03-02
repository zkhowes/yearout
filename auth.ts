import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Apple from 'next-auth/providers/apple'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/db'
import { users, accounts, sessions, verificationTokens } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
  ],
  session: { strategy: 'database' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return true

      // Check for an existing stub user with this email
      const existing = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.email, user.email!),
      })
      if (!existing) return true // new user — let adapter create normally

      // Check if this OAuth account is already linked
      const linked = await db.query.accounts.findFirst({
        where: (a, { and, eq }) =>
          and(
            eq(a.provider, account.provider),
            eq(a.providerAccountId, account.providerAccountId)
          ),
      })

      if (!linked) {
        // Link OAuth account to the existing stub user
        await db
          .insert(accounts)
          .values({
            userId: existing.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token ?? null,
            access_token: account.access_token ?? null,
            expires_at: account.expires_at ?? null,
            token_type: account.token_type ?? null,
            scope: account.scope ?? null,
            id_token: account.id_token ?? null,
            session_state: account.session_state as string ?? null,
          })
          .onConflictDoNothing()

        // Update profile info from OAuth
        await db
          .update(users)
          .set({
            name: user.name ?? existing.name,
            image: user.image ?? existing.image,
          })
          .where(eq(users.id, existing.id))
      }

      return true
    },
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})
