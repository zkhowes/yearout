'use client'

import { useRouter } from 'next/navigation'
import { QuickAddFab, type QuickAddTab } from '@/components/quick-add-fab'

export function QuickAddNav({ href }: { href: string }) {
  const router = useRouter()

  function handleSelect(tab: QuickAddTab) {
    router.push(`${href}?tab=${tab}`)
  }

  return <QuickAddFab onSelect={handleSelect} />
}
