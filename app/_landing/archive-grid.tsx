// Faux archive grid used as the hero visual on the public landing page.
// Pure SSR — no real data, no client JS. Each tile mimics the shape of
// a closed Event card from the in-app archive so visitors immediately
// understand the product is about preserved years, not one-off trips.

type Tile = {
  year: string
  location: string
  award: string
  lore: string
  theme: 'circuit' | 'club' | 'trail' | 'getaway'
}

const TILES: Tile[] = [
  {
    year: '2024',
    location: 'Whistler, BC',
    award: 'Most Sends',
    lore: '"He took the trees blind and lived."',
    theme: 'circuit',
  },
  {
    year: '2023',
    location: 'Pinehurst, NC',
    award: 'Lowest Net',
    lore: '"Eagle on 17. Witnessed."',
    theme: 'club',
  },
  {
    year: '2022',
    location: 'Wind River, WY',
    award: 'Heaviest Pack',
    lore: '"Forded the creek twice. On purpose."',
    theme: 'trail',
  },
  {
    year: '2021',
    location: 'Outer Banks, NC',
    award: "Cousin of the Year",
    lore: '"The boat held. The marriage almost didn\'t."',
    theme: 'getaway',
  },
  {
    year: '2020',
    location: 'Jackson Hole, WY',
    award: 'First Tracks',
    lore: '"The lift line was empty. So was the bar."',
    theme: 'circuit',
  },
  {
    year: '2019',
    location: 'St Andrews, Scotland',
    award: 'Calmest in Wind',
    lore: '"Played the Old Course in horizontal rain."',
    theme: 'club',
  },
]

export function ArchiveGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {TILES.map((t) => (
        <ArchiveTile key={t.year + t.location} tile={t} />
      ))}
    </div>
  )
}

function ArchiveTile({ tile }: { tile: Tile }) {
  return (
    <div
      data-theme={tile.theme}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2 min-h-[160px] shadow-sm"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-display text-2xl text-[var(--fg)] leading-none">
          {tile.year}
        </span>
        <Medallion />
      </div>
      <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">
        {tile.location}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-semibold">
        {tile.award}
      </div>
      <div className="text-xs italic text-[var(--fg)] leading-snug mt-auto">
        {tile.lore}
      </div>
    </div>
  )
}

function Medallion() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="text-[var(--accent)]"
    >
      <circle cx="10" cy="9" r="5" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M7 13 L6 18 L10 16 L14 18 L13 13"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
