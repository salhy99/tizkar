import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  
  if (!path) {
    return new NextResponse('Missing path', { status: 400 })
  }

  // Basic validation to ensure path is within invitations_assets
  if (path.includes('..') || path.startsWith('/')) {
    return new NextResponse('Invalid path', { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.storage.from('invitations_assets').createSignedUrl(path, 3600)
  
  if (error || !data?.signedUrl) {
    return new NextResponse('Not found', { status: 404 })
  }

  return NextResponse.redirect(data.signedUrl)
}
