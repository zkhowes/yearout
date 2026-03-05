// Deterministic pseudo-random flag SVG generator.
// Given a numeric seed, produces a small SVG string with a flag-like pattern.

const COLORS = [
  '#c41e3a', '#003da5', '#006b3f', '#fcd116', '#ff8c00',
  '#1a1a2e', '#ffffff', '#e30a17', '#002868', '#bf0a30',
  '#009246', '#ce1126', '#00247d', '#ed2939', '#002395',
  '#f7d618', '#169b62', '#7b3f00', '#4b0082', '#2d5a3d',
]

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function pickColors(rand: () => number, count: number): string[] {
  const picked: string[] = []
  const pool = [...COLORS]
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * pool.length)
    picked.push(pool[idx])
    pool.splice(idx, 1)
    if (pool.length === 0) pool.push(...COLORS)
  }
  return picked
}

type PatternFn = (rand: () => number) => string

const patterns: PatternFn[] = [
  // Horizontal 2-stripe
  (rand) => {
    const [a, b] = pickColors(rand, 2)
    return `<rect width="60" height="20" fill="${a}"/><rect y="20" width="60" height="20" fill="${b}"/>`
  },
  // Horizontal 3-stripe
  (rand) => {
    const [a, b, c] = pickColors(rand, 3)
    return `<rect width="60" height="14" fill="${a}"/><rect y="13" width="60" height="14" fill="${b}"/><rect y="26" width="60" height="14" fill="${c}"/>`
  },
  // Vertical 3-stripe
  (rand) => {
    const [a, b, c] = pickColors(rand, 3)
    return `<rect width="20" height="40" fill="${a}"/><rect x="20" width="20" height="40" fill="${b}"/><rect x="40" width="20" height="40" fill="${c}"/>`
  },
  // Nordic cross
  (rand) => {
    const [bg, cross] = pickColors(rand, 2)
    return `<rect width="60" height="40" fill="${bg}"/><rect x="0" y="16" width="60" height="8" fill="${cross}"/><rect x="18" y="0" width="8" height="40" fill="${cross}"/>`
  },
  // Diagonal bicolor
  (rand) => {
    const [a, b] = pickColors(rand, 2)
    return `<rect width="60" height="40" fill="${a}"/><polygon points="0,0 60,0 60,40" fill="${b}"/>`
  },
  // Chevron
  (rand) => {
    const [bg, chev] = pickColors(rand, 2)
    return `<rect width="60" height="40" fill="${bg}"/><polygon points="0,0 24,20 0,40" fill="${chev}"/>`
  },
  // Saltire (X cross)
  (rand) => {
    const [bg, cross] = pickColors(rand, 2)
    return `<rect width="60" height="40" fill="${bg}"/><line x1="0" y1="0" x2="60" y2="40" stroke="${cross}" stroke-width="6"/><line x1="60" y1="0" x2="0" y2="40" stroke="${cross}" stroke-width="6"/>`
  },
  // Quartered
  (rand) => {
    const [a, b] = pickColors(rand, 2)
    return `<rect width="30" height="20" fill="${a}"/><rect x="30" width="30" height="20" fill="${b}"/><rect y="20" width="30" height="20" fill="${b}"/><rect x="30" y="20" width="30" height="20" fill="${a}"/>`
  },
]

export function generateFlagSvg(seed: number): string {
  const rand = seededRandom(seed)
  const pattern = patterns[Math.floor(rand() * patterns.length)]
  const inner = pattern(rand)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">${inner}</svg>`
}

export function flagSvgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
