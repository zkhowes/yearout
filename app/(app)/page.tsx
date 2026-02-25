export default async function DashboardPage() {

  // TODO: fetch circuits the user belongs to
  const circuits: unknown[] = []

  if (circuits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--fg)]">
            You&apos;re not on any circuits yet.
          </h2>
          <p className="mt-2 text-[var(--fg-muted)] text-sm">
            Want to create one? We&apos;ll help you get started.
          </p>
        </div>
        <a
          href="/new"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg btn-accent text-sm font-semibold transition-opacity"
        >
          Create a Circuit
        </a>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--fg)] mb-4">Your Circuits</h1>
      {/* TODO: circuit cards */}
    </div>
  )
}
