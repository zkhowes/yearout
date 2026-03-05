const NATIONALITY_MAP: Record<string, string> = {
  american: 'https://flagcdn.com/w40/us.png',
  usa: 'https://flagcdn.com/w40/us.png',
  canadian: 'https://flagcdn.com/w40/ca.png',
  british: 'https://flagcdn.com/w40/gb.png',
  australian: 'https://flagcdn.com/w40/au.png',
  mexican: 'https://flagcdn.com/w40/mx.png',
  french: 'https://flagcdn.com/w40/fr.png',
  german: 'https://flagcdn.com/w40/de.png',
  japanese: 'https://flagcdn.com/w40/jp.png',
  italian: 'https://flagcdn.com/w40/it.png',
  spanish: 'https://flagcdn.com/w40/es.png',
  brazilian: 'https://flagcdn.com/w40/br.png',
  irish: 'https://flagcdn.com/w40/ie.png',
  scottish: 'https://flagcdn.com/w40/gb-sct.png',
  welsh: 'https://flagcdn.com/w40/gb-wls.png',
  dutch: 'https://flagcdn.com/w40/nl.png',
  swedish: 'https://flagcdn.com/w40/se.png',
  norwegian: 'https://flagcdn.com/w40/no.png',
  danish: 'https://flagcdn.com/w40/dk.png',
  finnish: 'https://flagcdn.com/w40/fi.png',
  swiss: 'https://flagcdn.com/w40/ch.png',
  austrian: 'https://flagcdn.com/w40/at.png',
  'new zealander': 'https://flagcdn.com/w40/nz.png',
  kiwi: 'https://flagcdn.com/w40/nz.png',
  'south african': 'https://flagcdn.com/w40/za.png',
  indian: 'https://flagcdn.com/w40/in.png',
  chinese: 'https://flagcdn.com/w40/cn.png',
  korean: 'https://flagcdn.com/w40/kr.png',
  colombian: 'https://flagcdn.com/w40/co.png',
  argentinian: 'https://flagcdn.com/w40/ar.png',
  cascadia: '/flags/cascadia.svg',
  cascadian: '/flags/cascadia.svg',
}

export function getNationalityFlag(
  nationality: string | null | undefined,
  customFlagSvg?: string | null,
): string | null {
  if (!nationality) return null
  const mapped = NATIONALITY_MAP[nationality.toLowerCase().trim()]
  if (mapped) return mapped
  if (customFlagSvg) return `data:image/svg+xml,${encodeURIComponent(customFlagSvg)}`
  return null
}

export function hasKnownFlag(nationality: string | null | undefined): boolean {
  if (!nationality) return false
  return nationality.toLowerCase().trim() in NATIONALITY_MAP
}
