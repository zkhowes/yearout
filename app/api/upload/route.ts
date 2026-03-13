import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  // Accept any image/* MIME type, or fall back to file extension check
  // (some mobile browsers report empty or incorrect MIME types for photos)
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|gif|webp|heic|heif|tiff?|bmp|avif)$/i.test(file.name)
  if (!isImage) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
  }

  try {
    // Prefix with UUID to prevent collisions when re-uploading the same filename
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
    const uniqueName = `${crypto.randomUUID()}${ext}`
    const blob = await put(uniqueName, file, {
      access: 'public',
    })
    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error('Blob upload failed:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    )
  }
}
