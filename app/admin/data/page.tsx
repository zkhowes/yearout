export default function AdminDataPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Data Management</h2>
        <p className="text-xs text-gray-500">Seed data, manual triggers, and platform tools</p>
      </div>

      {/* CSV Import */}
      <div className="border border-gray-800 rounded-lg p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">CSV Import</h3>
          <p className="text-xs text-gray-500 mt-1">
            Seed historical event data from a CSV file. Place the file at{' '}
            <code className="text-yellow-400">/public/files/</code> before importing.
          </p>
        </div>
        <button
          disabled
          className="self-start px-4 py-2 rounded bg-gray-800 text-gray-400 text-sm cursor-not-allowed"
        >
          Import Torture Tour CSV
        </button>
      </div>

      {/* Manual Call trigger */}
      <div className="border border-gray-800 rounded-lg p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Manual Call Trigger</h3>
          <p className="text-xs text-gray-500 mt-1">
            Fire any Call stage for any circuit. For testing purposes only.
          </p>
        </div>
        <button
          disabled
          className="self-start px-4 py-2 rounded bg-gray-800 text-gray-400 text-sm cursor-not-allowed"
        >
          Trigger a Call — coming soon
        </button>
      </div>

      {/* Email history */}
      <div className="border border-gray-800 rounded-lg p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Email Send History</h3>
          <p className="text-xs text-gray-500 mt-1">
            View all Call emails sent, delivery status, and AI quotes used.
          </p>
        </div>
        <div className="text-sm text-gray-600">No sends yet.</div>
      </div>
    </div>
  )
}
