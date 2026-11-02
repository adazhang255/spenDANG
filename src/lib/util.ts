export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const currencyRound = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function money(n: number, round = false): string {
  return (round ? currencyRound : currency).format(n)
}

/** Naive English plural, good enough for unit nouns like "coffee", "boba run", "party". */
export function plural(word: string, n: number): string {
  if (n === 1 || !word) return word
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies'
  if (/(s|sh|ch|x|z)$/i.test(word)) return word + 'es'
  return word + 's'
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
