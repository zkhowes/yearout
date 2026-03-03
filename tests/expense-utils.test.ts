import { describe, it, expect } from 'vitest'
import {
  computeEqualSplit,
  computeBalances,
  computeSettlements,
  validateExactSplit,
  type ExpenseInput,
  type PaymentInput,
} from '@/lib/expense-utils'

// ── computeEqualSplit ────────────────────────────────────────────────────────

describe('computeEqualSplit', () => {
  it('splits evenly when divisible', () => {
    const result = computeEqualSplit(3000, ['a', 'b', 'c'])
    expect(result.get('a')).toBe(1000)
    expect(result.get('b')).toBe(1000)
    expect(result.get('c')).toBe(1000)
  })

  it('distributes remainder cents round-robin', () => {
    // 1001 / 3 = 333 remainder 2 → first two get 334
    const result = computeEqualSplit(1001, ['a', 'b', 'c'])
    expect(result.get('a')).toBe(334)
    expect(result.get('b')).toBe(334)
    expect(result.get('c')).toBe(333)
    // Must sum to total
    const sum = Array.from(result.values()).reduce((s, v) => s + v, 0)
    expect(sum).toBe(1001)
  })

  it('handles single person', () => {
    const result = computeEqualSplit(5000, ['a'])
    expect(result.get('a')).toBe(5000)
  })

  it('handles zero total', () => {
    const result = computeEqualSplit(0, ['a', 'b'])
    expect(result.get('a')).toBe(0)
    expect(result.get('b')).toBe(0)
  })

  it('handles empty participants', () => {
    const result = computeEqualSplit(1000, [])
    expect(result.size).toBe(0)
  })

  it('large group with 1 cent total', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `u${i}`)
    const result = computeEqualSplit(1, ids)
    // Only first person gets the 1 cent
    expect(result.get('u0')).toBe(1)
    for (let i = 1; i < 10; i++) {
      expect(result.get(`u${i}`)).toBe(0)
    }
    const sum = Array.from(result.values()).reduce((s, v) => s + v, 0)
    expect(sum).toBe(1)
  })

  it('large group with remainder less than group size', () => {
    // 10007 / 7 = 1429 remainder 4
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const result = computeEqualSplit(10007, ids)
    expect(result.get('a')).toBe(1430)
    expect(result.get('d')).toBe(1430)
    expect(result.get('e')).toBe(1429)
    expect(result.get('g')).toBe(1429)
    const sum = Array.from(result.values()).reduce((s, v) => s + v, 0)
    expect(sum).toBe(10007)
  })
})

// ── computeBalances ──────────────────────────────────────────────────────────

describe('computeBalances', () => {
  it('single payer, equal split', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 3000,
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
          { userId: 'c', amount: 1000 },
        ],
      },
    ]
    const balances = computeBalances(expenses, [], ['a', 'b', 'c'])
    // a paid 3000, owes 1000 → net +2000
    expect(balances.get('a')).toBe(2000)
    // b paid 0, owes 1000 → net -1000
    expect(balances.get('b')).toBe(-1000)
    expect(balances.get('c')).toBe(-1000)
  })

  it('multiple payers', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 6000,
        splits: [
          { userId: 'a', amount: 3000 },
          { userId: 'b', amount: 3000 },
        ],
      },
      {
        id: 'e2',
        paidBy: 'b',
        amount: 4000,
        splits: [
          { userId: 'a', amount: 2000 },
          { userId: 'b', amount: 2000 },
        ],
      },
    ]
    const balances = computeBalances(expenses, [], ['a', 'b'])
    // a: paid 6000, owed 3000+2000=5000 → net +1000
    expect(balances.get('a')).toBe(1000)
    // b: paid 4000, owed 3000+2000=5000 → net -1000
    expect(balances.get('b')).toBe(-1000)
  })

  it('with paid/confirmed payments', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 2000,
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
        ],
      },
    ]
    // b has already paid a $5 (500 cents) — more than owed
    const payments: PaymentInput[] = [
      { id: 'p1', fromUserId: 'b', toUserId: 'a', amount: 500, status: 'paid' },
    ]
    const balances = computeBalances(expenses, payments, ['a', 'b'])
    // a: paid 2000, owed 1000, receives 500 reduction → 2000 - 1000 - 500 = 500
    expect(balances.get('a')).toBe(500)
    // b: paid 0, owed 1000, pays 500 → 0 - 1000 + 500 = -500
    expect(balances.get('b')).toBe(-500)
  })

  it('ignores pending payments', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 2000,
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
        ],
      },
    ]
    const payments: PaymentInput[] = [
      { id: 'p1', fromUserId: 'b', toUserId: 'a', amount: 1000, status: 'pending' },
    ]
    const balances = computeBalances(expenses, payments, ['a', 'b'])
    // Pending payment ignored — same as no payments
    expect(balances.get('a')).toBe(1000)
    expect(balances.get('b')).toBe(-1000)
  })

  it('confirmed payments count', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 2000,
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
        ],
      },
    ]
    const payments: PaymentInput[] = [
      { id: 'p1', fromUserId: 'b', toUserId: 'a', amount: 1000, status: 'confirmed' },
    ]
    const balances = computeBalances(expenses, payments, ['a', 'b'])
    // Fully settled
    expect(balances.get('a')).toBe(0)
    expect(balances.get('b')).toBe(0)
  })

  it('all even — no debts', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 1000,
        splits: [
          { userId: 'a', amount: 500 },
          { userId: 'b', amount: 500 },
        ],
      },
      {
        id: 'e2',
        paidBy: 'b',
        amount: 1000,
        splits: [
          { userId: 'a', amount: 500 },
          { userId: 'b', amount: 500 },
        ],
      },
    ]
    const balances = computeBalances(expenses, [], ['a', 'b'])
    expect(balances.get('a')).toBe(0)
    expect(balances.get('b')).toBe(0)
  })
})

// ── computeSettlements ───────────────────────────────────────────────────────

describe('computeSettlements', () => {
  it('2-person simple', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 2000,
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
        ],
      },
    ]
    const settlements = computeSettlements(expenses, [], ['a', 'b'])
    expect(settlements).toEqual([
      { from: 'b', to: 'a', amountCents: 1000 },
    ])
  })

  it('3-person: one payer', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 3000,
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
          { userId: 'c', amount: 1000 },
        ],
      },
    ]
    const settlements = computeSettlements(expenses, [], ['a', 'b', 'c'])
    expect(settlements.length).toBe(2)
    const totalToA = settlements
      .filter((s) => s.to === 'a')
      .reduce((sum, s) => sum + s.amountCents, 0)
    expect(totalToA).toBe(2000)
  })

  it('complex 4-person', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 4000,
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
          { userId: 'c', amount: 1000 },
          { userId: 'd', amount: 1000 },
        ],
      },
      {
        id: 'e2',
        paidBy: 'b',
        amount: 2000,
        splits: [
          { userId: 'a', amount: 500 },
          { userId: 'b', amount: 500 },
          { userId: 'c', amount: 500 },
          { userId: 'd', amount: 500 },
        ],
      },
    ]
    const settlements = computeSettlements(expenses, [], ['a', 'b', 'c', 'd'])

    // Verify net transfers balance out
    const netCheck = new Map<string, number>()
    for (const s of settlements) {
      netCheck.set(s.from, (netCheck.get(s.from) ?? 0) - s.amountCents)
      netCheck.set(s.to, (netCheck.get(s.to) ?? 0) + s.amountCents)
    }

    // a: paid 4000, owed 1500 → net +2500 (should receive 2500)
    expect(netCheck.get('a') ?? 0).toBe(2500)
    // b: paid 2000, owed 1500 → net +500
    expect(netCheck.get('b') ?? 0).toBe(500)
    // c: paid 0, owed 1500 → net -1500
    expect(netCheck.get('c') ?? 0).toBe(-1500)
    // d: paid 0, owed 1500 → net -1500
    expect(netCheck.get('d') ?? 0).toBe(-1500)
  })

  it('after partial payment', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 2000,
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
        ],
      },
    ]
    const payments: PaymentInput[] = [
      { id: 'p1', fromUserId: 'b', toUserId: 'a', amount: 400, status: 'paid' },
    ]
    const settlements = computeSettlements(expenses, payments, ['a', 'b'])
    expect(settlements).toEqual([
      { from: 'b', to: 'a', amountCents: 600 },
    ])
  })

  it('after full payment — no settlements needed', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 2000,
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
        ],
      },
    ]
    const payments: PaymentInput[] = [
      { id: 'p1', fromUserId: 'b', toUserId: 'a', amount: 1000, status: 'confirmed' },
    ]
    const settlements = computeSettlements(expenses, payments, ['a', 'b'])
    expect(settlements).toEqual([])
  })

  it('rounding edge case: 1 cent among 3', () => {
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        paidBy: 'a',
        amount: 1,
        splits: [
          { userId: 'a', amount: 1 },
          { userId: 'b', amount: 0 },
          { userId: 'c', amount: 0 },
        ],
      },
    ]
    // a paid 1 cent, owes 1 cent → net 0
    const settlements = computeSettlements(expenses, [], ['a', 'b', 'c'])
    expect(settlements).toEqual([])
  })

  it('no expenses — no settlements', () => {
    const settlements = computeSettlements([], [], ['a', 'b', 'c'])
    expect(settlements).toEqual([])
  })
})

// ── validateExactSplit ───────────────────────────────────────────────────────

describe('validateExactSplit', () => {
  it('valid exact split', () => {
    const result = validateExactSplit(5000, [
      { userId: 'a', amount: 2000 },
      { userId: 'b', amount: 3000 },
    ])
    expect(result).toBeNull()
  })

  it('sum mismatch', () => {
    const result = validateExactSplit(5000, [
      { userId: 'a', amount: 2000 },
      { userId: 'b', amount: 2000 },
    ])
    expect(result).toContain('4000')
    expect(result).toContain('5000')
  })

  it('negative amounts', () => {
    const result = validateExactSplit(1000, [
      { userId: 'a', amount: 1500 },
      { userId: 'b', amount: -500 },
    ])
    expect(result).toContain('Negative')
  })

  it('empty splits', () => {
    const result = validateExactSplit(1000, [])
    expect(result).toContain('participant')
  })

  it('zero total with zero splits is valid', () => {
    const result = validateExactSplit(0, [
      { userId: 'a', amount: 0 },
    ])
    expect(result).toBeNull()
  })
})
