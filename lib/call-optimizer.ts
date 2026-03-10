/**
 * The Call — Optimal trip computation
 *
 * Given date options, location options, and crew votes, finds the
 * (date, location) combo with the best coverage.
 */

export type OptimalResult = {
  dateOptionId: string
  locationOptionId: string
  coverage: number        // crew who voted for BOTH this date + location
  totalCrew: number
  coveredUsers: string[]  // user IDs who voted for both
  missingUsers: string[]  // user IDs who did NOT vote for both
}

export function computeOptimal(
  mode: 'best_fit' | 'all_or_none',
  dateOptions: { id: string }[],
  locationOptions: { id: string }[],
  votes: { userId: string; optionType: string; optionId: string }[],
  crewUserIds: string[],
): OptimalResult | null {
  // Build lookup: userId → Set of optionIds they voted for, per type
  const dateVotes = new Map<string, Set<string>>()
  const locationVotes = new Map<string, Set<string>>()

  for (const v of votes) {
    const map = v.optionType === 'date' ? dateVotes : locationVotes
    let set = map.get(v.userId)
    if (!set) {
      set = new Set()
      map.set(v.userId, set)
    }
    set.add(v.optionId)
  }

  let best: OptimalResult | null = null

  for (const date of dateOptions) {
    for (const loc of locationOptions) {
      const covered: string[] = []
      const missing: string[] = []

      for (const uid of crewUserIds) {
        const votedDate = dateVotes.get(uid)?.has(date.id) ?? false
        const votedLoc = locationVotes.get(uid)?.has(loc.id) ?? false
        if (votedDate && votedLoc) {
          covered.push(uid)
        } else {
          missing.push(uid)
        }
      }

      const result: OptimalResult = {
        dateOptionId: date.id,
        locationOptionId: loc.id,
        coverage: covered.length,
        totalCrew: crewUserIds.length,
        coveredUsers: covered,
        missingUsers: missing,
      }

      if (mode === 'all_or_none' && result.coverage < result.totalCrew) {
        continue // skip non-unanimous combos
      }

      if (!best || result.coverage > best.coverage) {
        best = result
      }
    }
  }

  return best
}
