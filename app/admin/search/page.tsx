export default function AdminSearchPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Search & Browse</h2>
        <p className="text-xs text-gray-500">Search circuits, events, and crew across the platform</p>
      </div>

      <div className="relative">
        <input
          type="search"
          placeholder="Search circuits, events, crew members..."
          className="w-full px-4 py-3 pl-10 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gray-500"
        />
        <svg
          className="absolute left-3 top-3.5 text-gray-500"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>

      <div className="border border-gray-800 rounded-lg p-8 text-center text-gray-600 text-sm">
        Search results will appear here.
        <br />
        <span className="text-gray-700">Full-text search wiring coming soon.</span>
      </div>
    </div>
  )
}
