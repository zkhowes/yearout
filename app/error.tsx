'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="text-center flex flex-col gap-4 max-w-sm">
        <h2 className="text-lg font-bold">Something went wrong</h2>
        <p className="text-sm text-neutral-500">
          {error.digest
            ? `Error reference: ${error.digest}`
            : 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors self-center"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
