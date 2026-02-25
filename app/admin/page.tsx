// Analytics tab — Super Admin dashboard

const statCards = [
  { label: 'Total Circuits', value: '—', sub: 'all time' },
  { label: 'Total Events', value: '—', sub: 'all time' },
  { label: 'Sponsors', value: '—', sub: 'unique' },
  { label: 'Crew Members', value: '—', sub: 'unique users' },
]

const stageRows = [
  { stage: 'planning', count: '—', note: 'Awaiting proposals / voting' },
  { stage: 'scheduled', count: '—', note: 'Confirmed, booking in progress' },
  { stage: 'in_progress', count: '—', note: 'Trip is active' },
  { stage: 'closed', count: '—', note: 'Sealed and archived' },
]

export default function AdminAnalyticsPage() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Platform Overview</h2>
        <p className="text-xs text-gray-500">Live counts — data from Neon</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{card.label}</p>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-gray-600 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Events by stage */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
          Events by Stage
        </h3>
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Stage</th>
                <th className="text-left px-4 py-3">Count</th>
                <th className="text-left px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {stageRows.map((row) => (
                <tr key={row.stage} className="hover:bg-gray-900 transition-colors">
                  <td className="px-4 py-3 font-mono text-yellow-400">{row.stage}</td>
                  <td className="px-4 py-3 text-white font-semibold">{row.count}</td>
                  <td className="px-4 py-3 text-gray-500">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stall detection */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
          Stall Detection
        </h3>
        <div className="border border-gray-800 rounded-lg p-6 text-center text-gray-600 text-sm">
          No stalled events detected. <span className="text-gray-700">(Data wiring coming soon)</span>
        </div>
      </div>
    </div>
  )
}
