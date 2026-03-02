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

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
  }

  try {
    const blob = await put(file.name, file, {
      access: 'public',
    })
    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error('Blob upload failed:', err)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
