import { Rune } from './rune'
import { SKALD_TAG } from '@/lib/skald/voice'

type Props = {
  tone?: 'brief' | 'oration'
  children: React.ReactNode
  className?: string
}

// Used wherever the Skald is the on-screen speaker. brief = single italic line.
// oration = rune + tracked uppercase prefix + multi-line italic block.
export function SkaldSpeaks({ tone = 'brief', children, className = '' }: Props) {
  if (tone === 'brief') {
    return (
      <p className={`text-sm italic text-[var(--fg-muted)] ${className}`}>
        {children}
      </p>
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Rune size={14} className="text-[var(--fg-muted)]" />
        <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          {SKALD_TAG}
        </span>
      </div>
      <div className="text-base italic leading-relaxed text-[var(--fg)]">
        {children}
      </div>
    </div>
  )
}
