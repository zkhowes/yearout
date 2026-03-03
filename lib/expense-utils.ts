/**
 * Pure expense computation functions — no DB, no side effects.
 * All monetary values are in cents (integers).
 */

export type ExpenseInput = {
  id: string
  paidBy: string
  amount: number // cents
  splits: { userId: string; amount: number }[] // per-person share in cents
}

export type PaymentInput = {
  id: string
  fromUserId: string
  toUserId: string
  amount: number // cents
  status: 'pending' | 'paid' | 'confirmed'
}

export type Settlement = {
  from: string
  to: string
  amountCents: number
}

/**
 * Distribute `totalCents` equally among `participantIds`.
 * Remainder cents are distributed round-robin (first participants get +1).
 * Returns a map of userId -> share in cents, always summing exactly to totalCents.
 */
export function computeEqualSplit(
  totalCents: number,
  participantIds: string[]
): Map<string, number> {
  if (participantIds.length === 0) return new Map()

  const base = Math.floor(totalCents / participantIds.length)
  const remainder = totalCents % participantIds.length
  const result = new Map<string, number>()

  for (let i = 0; i < participantIds.length; i++) {
    result.set(participantIds[i], base + (i < remainder ? 1 : 0))
  }

  return result
}

/**
 * Compute net balance per person across all expenses and settlement payments.
 * Positive = owed money (others owe you). Negative = you owe others.
 *
 * Only counts payments with status 'paid' or 'confirmed' (ignores 'pending').
 */
export function computeBalances(
  expenses: ExpenseInput[],
  payments: PaymentInput[],
  participantIds: string[]
): Map<string, number> {
  const balances = new Map<string, number>()
  for (const id of participantIds) balances.set(id, 0)

  // For each expense: payer gets +amount, each split participant gets -splitAmount
  for (const expense of expenses) {
    const current = balances.get(expense.paidBy) ?? 0
    balances.set(expense.paidBy, current + expense.amount)

    for (const split of expense.splits) {
      const cur = balances.get(split.userId) ?? 0
      balances.set(split.userId, cur - split.amount)
    }
  }

  // Settlement payments reduce debts (only paid/confirmed count)
  for (const payment of payments) {
    if (payment.status === 'pending') continue
    // fromUser paid toUser, so fromUser's balance goes up, toUser's goes down
    const fromBal = balances.get(payment.fromUserId) ?? 0
    balances.set(payment.fromUserId, fromBal + payment.amount)
    const toBal = balances.get(payment.toUserId) ?? 0
    balances.set(payment.toUserId, toBal - payment.amount)
  }

  return balances
}

/**
 * Greedy minimum-transaction settlement algorithm.
 * Takes expenses + payments and produces the minimum set of transfers
 * to settle all debts.
 */
export function computeSettlements(
  expenses: ExpenseInput[],
  payments: PaymentInput[],
  participantIds: string[]
): Settlement[] {
  const balances = computeBalances(expenses, payments, participantIds)

  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors: [string, number][] = []
  const debtors: [string, number][] = []

  for (const [userId, balance] of Array.from(balances.entries())) {
    if (balance > 0) creditors.push([userId, balance])
    else if (balance < 0) debtors.push([userId, Math.abs(balance)])
  }

  // Sort descending by amount for greedy matching
  creditors.sort((a, b) => b[1] - a[1])
  debtors.sort((a, b) => b[1] - a[1])

  const settlements: Settlement[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const transfer = Math.min(creditors[ci][1], debtors[di][1])
    if (transfer > 0) {
      settlements.push({
        from: debtors[di][0],
        to: creditors[ci][0],
        amountCents: transfer,
      })
    }
    creditors[ci][1] -= transfer
    debtors[di][1] -= transfer
    if (creditors[ci][1] === 0) ci++
    if (debtors[di][1] === 0) di++
  }

  return settlements
}

/**
 * Validate that exact split amounts sum to the total.
 * Returns null if valid, or an error message string.
 */
export function validateExactSplit(
  totalCents: number,
  splits: { userId: string; amount: number }[]
): string | null {
  if (splits.length === 0) return 'At least one participant required'

  const sum = splits.reduce((s, sp) => s + sp.amount, 0)
  if (sum !== totalCents) {
    return `Split amounts sum to ${sum} cents but total is ${totalCents} cents`
  }

  for (const sp of splits) {
    if (sp.amount < 0) return `Negative amount for user ${sp.userId}`
  }

  return null
}
