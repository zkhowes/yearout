import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'

export default function NewRitualChooserPage() {
  return (
    <div
      className="max-w-2xl mx-auto px-4 min-h-[70vh] flex flex-col justify-center gap-10 py-8"
      style={{ paddingTop: 'calc(var(--header-height) + 24px)' }}
    >
      <SkaldSpeaks tone="oration">
        Forty years from now you will not remember the spreadsheet. You will
        remember the cold morning, the wrong turn, the friend who would not
        shut up about his binding.
        <br />
        <br />
        I am here to help you make a ritual the gods will be proud of.
      </SkaldSpeaks>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/new/named"
          className="group flex flex-col gap-3 px-5 py-6 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--fg)] transition-colors"
        >
          <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            I have one
          </span>
          <span className="text-xl font-bold text-[var(--fg)]">Already named.</span>
          <span className="text-sm text-[var(--fg-muted)] leading-snug">
            You know what you call it. Tell me, and I will draft the rest.
          </span>
          <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--fg)] group-hover:translate-x-0.5 transition-transform">
            Begin <ArrowRight size={14} />
          </span>
        </Link>

        <Link
          href="/new/help"
          className="group flex flex-col gap-3 px-5 py-6 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--fg)] transition-colors"
        >
          <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            Help me
          </span>
          <span className="text-xl font-bold text-[var(--fg)]">No idea where to start.</span>
          <span className="text-sm text-[var(--fg-muted)] leading-snug">
            Walk with me. I will ask questions, and the name will find you.
          </span>
          <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--fg)] group-hover:translate-x-0.5 transition-transform">
            Walk with the Skald <ArrowRight size={14} />
          </span>
        </Link>
      </div>
    </div>
  )
}
