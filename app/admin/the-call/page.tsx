import { listRituals } from './actions'
import { TestHarness } from './TestHarness'

export const dynamic = 'force-dynamic'

export default async function AdminTheCallPage() {
  const ritualOptions = await listRituals()
  return <TestHarness ritualOptions={ritualOptions} />
}
