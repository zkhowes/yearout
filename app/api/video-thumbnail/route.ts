import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  // Vimeo oEmbed
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    try {
      const res = await fetch(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
        { next: { revalidate: 86400 } }
      )
      if (res.ok) {
        const data = await res.json()
        if (data.thumbnail_url) {
          // Get highest resolution by removing size suffix
          const highRes = data.thumbnail_url.replace(/_\d+x\d+/, '')
          return NextResponse.json({ thumbnailUrl: highRes })
        }
      }
    } catch {
      // fall through
    }
  }

  // YouTube - client can already compute this, but handle here too
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (ytMatch) {
    return NextResponse.json({
      thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`,
    })
  }

  return NextResponse.json({ thumbnailUrl: null })
}
