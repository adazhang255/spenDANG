const MERCHANTS: [string, string, number, number][] = [
  // description, bank category, min, max
  ['STARBUCKS STORE 08812', 'Food & Drink', 4.5, 7.5],
  ['SQ *BOBA GUYS', 'Food & Drink', 5.5, 7.25],
  ['KUNG FU TEA #12', 'Food & Drink', 5, 6.75],
  ['CHIPOTLE 2291', 'Food & Drink', 11, 15],
  ['UBER *EATS PENDING', 'Food & Drink', 18, 32],
  ['SWEETGREEN UNION SQ', 'Food & Drink', 13, 17],
  ['TRADER JOE S #552', 'Groceries', 28, 64],
  ['AMC ONLINE 4412', 'Entertainment', 14, 19],
  ['STEAMGAMES.COM 4259522', 'Entertainment', 10, 30],
  ['MTA*NYCT PAYGO', 'Travel', 2.9, 2.9],
  ['LYFT *RIDE SUN 8PM', 'Travel', 9, 22],
  ['AMZN Mktp US*2K39', 'Shopping', 12, 45],
  ['GOODWILL STORE 113', 'Shopping', 8, 25],
  ['TARGET 00012', 'Shopping', 15, 40],
]

const RECURRING: [string, string, number, number][] = [
  // description, bank category, amount, day of month
  ['SPOTIFY USA', 'Bills & Utilities', 5.99, 3],
  ['NETFLIX.COM', 'Bills & Utilities', 6.99, 9],
  ['MINT MOBILE', 'Bills & Utilities', 15, 12],
  ['CHEGG ORDER', 'Education', 15.95, 20],
]

/** Tiny deterministic PRNG so the sample looks the same every time. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

function fmt(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
}

/** A Chase-style card CSV covering the last ~4 months up to today. Purchases are negative. */
export function sampleCSV(): string {
  const rand = rng(42)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(today.getFullYear(), today.getMonth() - 3, 1)
  const lines = ['Transaction Date,Post Date,Description,Category,Type,Amount,Memo']
  const row = (d: Date, desc: string, cat: string, type: string, amt: number) =>
    lines.push(`${fmt(d)},${fmt(d)},${desc},${cat},${type},${amt.toFixed(2)},`)

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    for (const [desc, cat, amt, day] of RECURRING) if (d.getDate() === day) row(d, desc, cat, 'Sale', -amt)
    if (d.getDate() === 25) row(d, 'Payment Thank You-Mobile', '', 'Payment', 300)
    const n = rand() < 0.35 ? 0 : rand() < 0.75 ? 1 : 2
    for (let i = 0; i < n; i++) {
      const [desc, cat, min, max] = MERCHANTS[Math.floor(rand() * MERCHANTS.length)]
      row(d, desc, cat, 'Sale', -(min + rand() * (max - min)))
    }
  }
  return lines.join('\n')
}
