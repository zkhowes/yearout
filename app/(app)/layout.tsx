import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <Header />
      <main
        className="mx-auto max-w-2xl px-4"
        style={{ paddingTop: 'calc(var(--header-height) + 24px)' }}
      >
        {children}
      </main>
    </div>
  )
}
