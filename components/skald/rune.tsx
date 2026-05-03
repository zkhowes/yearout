// Drop-in replacement for <Sparkles> from lucide-react wherever the Skald
// is the speaker. Renders ᚱ (Raido — "ride/journey"). Swappable to inline
// SVG later without changing call sites.

type Props = {
  size?: number
  className?: string
}

export function Rune({ size = 14, className = '' }: Props) {
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size,
        lineHeight: 1,
        fontFamily:
          '"Noto Sans Runic", "Segoe UI Historic", "Apple Symbols", serif',
      }}
    >
      ᚱ
    </span>
  )
}
