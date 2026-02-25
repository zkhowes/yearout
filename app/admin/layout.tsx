import Link from 'next/link'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

const tabs = [
  { label: 'Analytics', href: '/admin' },
  { label: 'Search', href: '/admin/search' },
  { label: 'Data', href: '/admin/data' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-dvh bg-gray-950 text-gray-100 font-mono">
      {/* Admin header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Yearout</span>
          <span className="text-gray-700">/</span>
          <span className="text-sm text-white font-semibold">Admin</span>
        </div>
        <span className="text-xs text-gray-500">{session.user?.email}</span>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-gray-800 px-6 flex gap-6">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="py-3 text-sm text-gray-400 hover:text-white border-b-2 border-transparent hover:border-gray-500 transition-colors"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <main className="px-6 py-8 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  )
}
