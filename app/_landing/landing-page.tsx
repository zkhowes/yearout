import Link from 'next/link'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'
import { Rune } from '@/components/skald/rune'
import { ArchiveGrid } from './archive-grid'

export function LandingPage() {
  return (
    <main className="bg-app text-app min-h-dvh">
      <Masthead />
      <Hero />
      <Divider />
      <Problem />
      <Divider />
      <WhatIsARitual />
      <Divider />
      <Features />
      <Divider />
      <Themes />
      <Divider />
      <FinalCta />
      <Footer />
    </main>
  )
}

function Masthead() {
  return (
    <header className="w-full border-b border-app">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-4 flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight">Yearout</span>
        <Link
          href="/login"
          className="text-sm text-muted hover:text-app transition-colors"
        >
          Sign in
        </Link>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
        <div className="flex flex-col gap-7">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">
            For the trip that keeps coming back
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-balance">
            Every year.
            <br />
            Every crew.
            <br />
            Forever.
          </h1>
          <p className="text-lg text-muted leading-relaxed max-w-xl text-balance">
            Yearout is the keeper of your crew&apos;s annual ritual — planning,
            lore, awards, and the years that came before.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/login?next=/new"
              className="btn-accent inline-flex items-center justify-center px-6 py-3.5 rounded-lg text-sm font-semibold tracking-wide"
            >
              Begin a Ritual
            </Link>
            <Link
              href="/login"
              className="btn-outline inline-flex items-center justify-center px-6 py-3.5 rounded-lg text-sm font-semibold tracking-wide"
            >
              Bring your Ritual
            </Link>
          </div>
          <p className="text-xs text-muted">
            Invite-only. Free for crews of any size.
          </p>
        </div>
        <div className="lg:pl-4">
          <ArchiveGrid />
        </div>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section className="mx-auto max-w-3xl px-5 sm:px-8 py-20 sm:py-24 text-center">
      <h2 className="font-display text-3xl sm:text-4xl leading-tight tracking-tight flex flex-col gap-3">
        <span>Group chats die.</span>
        <span>Spreadsheets get lost.</span>
        <span>The one who plans it gets tired.</span>
      </h2>
      <div className="mt-10 flex justify-center">
        <SkaldSpeaks tone="oration" className="max-w-md text-left">
          Yearout makes sure the ritual outlives the planner.
        </SkaldSpeaks>
      </div>
    </section>
  )
}

function WhatIsARitual() {
  return (
    <section className="mx-auto max-w-3xl px-5 sm:px-8 py-20 sm:py-24">
      <p className="text-xs uppercase tracking-[0.25em] text-muted text-center">
        What you&apos;re building
      </p>
      <h2 className="mt-4 font-display text-3xl sm:text-4xl leading-tight tracking-tight text-center text-balance">
        Your annual trip is not just an event. It&apos;s a mythology worth
        preserving.
      </h2>
      <div className="mt-8 space-y-5 text-base sm:text-lg text-muted leading-relaxed text-balance">
        <p>
          A <span className="text-app font-medium">Ritual</span> is the
          tradition you intend to keep. Each year is an{' '}
          <span className="text-app font-medium">Event</span> — planned,
          attended, logged, closed. Every closed Event becomes part of the
          archive, and the archive becomes lore.
        </p>
        <p>
          One product carries the whole arc: from &ldquo;we should do this
          again&rdquo; to dates locked, to the trip itself, to the awards
          handed out at the end, to the hall of fame your crew will quote back
          to each other for years.
        </p>
      </div>
    </section>
  )
}

function Features() {
  const features: { title: string; body: string }[] = [
    {
      title: 'The Call',
      body: 'A summons sent at the right moment in the year. Picks dates, picks a place, gets the crew off the fence.',
    },
    {
      title: 'The Plan',
      body: 'Bookings, commitments, expense splitting. Whoever organizes this year doesn’t carry it alone.',
    },
    {
      title: 'The Lore',
      body: 'Daily entries, photos, and quotes from the trip. The moments worth remembering get flagged for the hall of fame.',
    },
    {
      title: 'The Archive',
      body: 'Every closed year stays. Awards podium, results, attendees, the stories. Searchable. Yours forever.',
    },
  ]
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-24">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.25em] text-muted">
          What Yearout does
        </p>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl leading-tight tracking-tight">
          Four parts. One ritual.
        </h2>
      </div>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-lg border border-app bg-surface p-6 flex flex-col gap-3"
          >
            <Rune size={18} className="text-app" />
            <h3 className="font-display text-xl tracking-tight">{f.title}</h3>
            <p className="text-sm text-muted leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Themes() {
  const themes: {
    key: 'circuit' | 'club' | 'trail' | 'getaway'
    name: string
    crew: string
    ritual: string
  }[] = [
    {
      key: 'circuit',
      name: 'The Circuit',
      crew: 'For the ski crew. Dark, gold, grungy.',
      ritual: 'The Torture Tour',
    },
    {
      key: 'club',
      name: 'The Club',
      crew: 'For the golfers. Cream, navy, serif.',
      ritual: 'The Member-Guest',
    },
    {
      key: 'trail',
      name: 'The Trail',
      crew: 'For the backpackers. Earthy, forest, warm.',
      ritual: 'The Long Walk',
    },
    {
      key: 'getaway',
      name: 'The Getaway',
      crew: 'For the family week. Warm, casual, light.',
      ritual: 'The Summer House',
    },
  ]
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-24">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.25em] text-muted">
          Choose the mood your crew already has
        </p>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl leading-tight tracking-tight">
          Four themes. Pick the one that fits.
        </h2>
      </div>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {themes.map((t) => (
          <div
            key={t.key}
            data-theme={t.key}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-4 min-h-[200px]"
          >
            <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--fg-muted)]">
              Theme
            </div>
            <div className="font-display text-2xl tracking-tight text-[var(--fg)] leading-tight">
              {t.name}
            </div>
            <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
              {t.crew}
            </p>
            <div className="mt-auto pt-3 border-t border-[var(--border)]">
              <div className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-semibold">
                Sample ritual
              </div>
              <div className="font-display text-lg text-[var(--fg)] leading-tight mt-1">
                {t.ritual}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-3xl px-5 sm:px-8 py-24 sm:py-28 text-center">
      <div className="flex justify-center">
        <SkaldSpeaks tone="oration" className="text-left max-w-md">
          Some traditions deserve to be carried.
        </SkaldSpeaks>
      </div>
      <h2 className="mt-8 font-display text-4xl sm:text-5xl leading-tight tracking-tight text-balance">
        Make yours one of them.
      </h2>
      <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/login?next=/new"
          className="btn-accent inline-flex items-center justify-center px-7 py-4 rounded-lg text-sm font-semibold tracking-wide"
        >
          Begin a Ritual
        </Link>
        <Link
          href="/login"
          className="btn-outline inline-flex items-center justify-center px-7 py-4 rounded-lg text-sm font-semibold tracking-wide"
        >
          Bring your Ritual
        </Link>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-app">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
        <span>Yearout — Every year. Every crew. Forever.</span>
        <Link href="/login" className="hover:text-app transition-colors">
          Sign in
        </Link>
      </div>
    </footer>
  )
}

function Divider() {
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <Rune size={14} className="text-muted" />
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
    </div>
  )
}
