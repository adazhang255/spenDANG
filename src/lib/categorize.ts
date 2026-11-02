import type { Category } from './types'

/** Lowercase, turn punctuation into spaces, collapse whitespace. "SQ *BOBA-GUYS" -> "sq boba guys" */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9&+]+/g, ' ')
    .trim()
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build a matcher for a keyword. Short keywords (<5 chars, like "bp", "deli" or "poke") must
 * match a whole word (optionally plural), so "deli" doesn't hit "delivery". Longer ones only
 * need to start a word, so "coffee" also hits "coffeehouse".
 */
export function keywordMatcher(keyword: string): RegExp {
  const k = escapeRegex(normalize(keyword))
  return k.length < 5 ? new RegExp(`(^| )${k}s?( |$)`) : new RegExp(`(^| )${k}`)
}

export function matchesAny(normalizedText: string, matchers: RegExp[]): boolean {
  return matchers.some((m) => m.test(normalizedText))
}

/** Ordered rules: the first match wins, so more specific rules (e.g. "uber eats") come first. */
const DESCRIPTION_RULES: [Category, string[]][] = [
  ['Transfers', ['payment thank you', 'autopay', 'online payment', 'transfer', 'zelle', 'venmo', 'cash app', 'paypal transfer', 'credit card payment', 'atm withdrawal']],
  ['Income', ['payroll', 'direct dep', 'direct deposit', 'salary', 'paycheck', 'interest paid', 'stipend', 'refund from', 'financial aid']],
  ['Food & Dining', [
    'uber eats', 'doordash', 'grubhub', 'postmates', 'starbucks', 'dunkin', 'coffee', 'cafe', 'boba', 'kung fu tea',
    'gong cha', 'sharetea', 'tiger sugar', 'peets', 'blue bottle', 'philz', 'dutch bros', 'tim hortons', 'tea house',
    'restaurant', 'grill', 'pizza', 'mcdonalds', 'chipotle', 'taco', 'burger', 'sushi', 'subway', 'panda express',
    'wendys', 'kfc', 'chick fil a', 'sweetgreen', 'cava', 'wingstop', 'five guys', 'in n out', 'ramen', 'pho', 'thai',
    'bbq', 'kitchen', 'bistro', 'diner', 'bakery', 'deli', 'dining', 'cafeteria', 'shake shack', 'dominos', 'papa johns',
    'popeyes', 'jack in the box', 'raising canes', 'noodle', 'dumpling', 'halal', 'poke', 'crumbl', 'insomnia cookies',
  ]],
  ['Groceries', [
    'trader joe', 'whole foods', 'safeway', 'kroger', 'aldi', 'costco', 'grocery', 'groceries', 'supermarket', 'heb',
    'publix', 'wegmans', 'sprouts', 'instacart', '99 ranch', 'h mart', 'food lion', 'stop & shop', 'ralphs', 'vons',
    'albertsons', 'meijer', 'market basket',
  ]],
  ['Subscriptions', [
    'netflix', 'spotify', 'hulu', 'disney plus', 'disneyplus', 'apple com bill', 'youtube premium', 'hbo', 'amazon prime',
    'prime video', 'icloud', 'adobe', 'crunchyroll', 'patreon', 'twitch', 'paramount', 'peacock', 'audible', 'notion',
  ]],
  ['Transport', [
    'uber', 'lyft', 'mta', 'bart', 'metro', 'transit', 'shell', 'chevron', 'exxon', 'bp', 'arco', 'gas station',
    'parking', 'amtrak', 'greyhound', 'clipper', 'ventra', 'citi bike', 'lime', 'bird', 'airline', 'delta air', 'united air',
    'southwest', 'jetblue', 'spirit air', 'toll', 'fastrak', 'ez pass',
  ]],
  ['Entertainment', [
    'amc', 'regal', 'cinema', 'cinemark', 'movie', 'theater', 'theatre', 'fandango', 'ticketmaster', 'steam', 'playstation',
    'xbox', 'nintendo', 'bowling', 'concert', 'eventbrite', 'museum', 'karaoke', 'arcade', 'stubhub', 'seatgeek', 'topgolf',
    'dave & busters', 'escape room', 'mini golf', 'round1', 'six flags', 'zoo', 'aquarium', 'riot games', 'epic games',
  ]],
  ['Education', ['tuition', 'bursar', 'chegg', 'textbook', 'pearson', 'mcgraw', 'coursera', 'udemy', 'quizlet', 'university', 'college']],
  ['Health', ['cvs', 'walgreens', 'rite aid', 'pharmacy', 'clinic', 'doctor', 'dental', 'gym', 'planet fitness', 'hospital', 'health', 'optometry']],
  ['Utilities', [
    'electric', 'pg&e', 'pge', 'con ed', 'coned', 'water', 'internet', 'comcast', 'xfinity', 'verizon', 'at&t', 'att',
    't mobile', 'tmobile', 'spectrum', 'utility', 'utilities', 'mint mobile', 'visible', 'google fi',
  ]],
  ['Housing', ['rent', 'apartment', 'property mgmt', 'property management', 'lease', 'residence hall', 'housing']],
  ['Shopping', [
    'amazon', 'amzn', 'target', 'walmart', 'best buy', 'ikea', 'etsy', 'ebay', 'shein', 'temu', 'h&m', 'uniqlo', 'zara',
    'nike', 'adidas', 'sephora', 'ulta', 'thrift', 'goodwill', 'savers', 'depop', 'poshmark', 'urban outfitters',
    'bookstore', 'apple store', 'tj maxx', 'tjmaxx', 'marshalls', 'ross', 'old navy', 'gap', 'forever 21', 'lululemon',
    'aritzia', 'brandy melville', 'muji', 'daiso', 'michaels', 'hobby lobby',
  ]],
]

const COMPILED_RULES: [Category, RegExp[]][] = DESCRIPTION_RULES.map(([cat, kws]) => [cat, kws.map(keywordMatcher)])

/** Map a bank-provided category label (Chase, Amex, Mint exports, ...) onto ours. */
const BANK_CATEGORY_RULES: [Category, RegExp][] = [
  ['Food & Dining', /food|drink|dining|restaurant|coffee|fast food|bar/],
  ['Groceries', /grocer|supermarket/],
  ['Transport', /travel|gas|fuel|auto|transport|parking|ride|taxi|transit/],
  ['Entertainment', /entertain|movie|music|game|recreation|fun|sport/],
  ['Subscriptions', /subscription|streaming/],
  ['Shopping', /shop|merchandise|clothing|retail|electronics|general/],
  ['Utilities', /bill|utilit|phone|internet|cable/],
  ['Housing', /rent|mortgage|housing|home/],
  ['Health', /health|medical|pharmac|fitness|personal care/],
  ['Education', /education|tuition|book/],
  ['Income', /income|paycheck|deposit|salary|interest/],
  ['Transfers', /payment|transfer|credit card/],
]

export function categorize(description: string, bankCategory?: string): Category {
  const text = normalize(description)
  for (const [cat, matchers] of COMPILED_RULES) {
    if (matchesAny(text, matchers)) return cat
  }
  if (bankCategory) {
    const b = bankCategory.toLowerCase()
    for (const [cat, re] of BANK_CATEGORY_RULES) {
      if (re.test(b)) return cat
    }
  }
  return 'Other'
}
