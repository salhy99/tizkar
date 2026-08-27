import { NextRequest, NextResponse } from 'next/server';
import { hashEditToken, setEditorSession } from '@/lib/auth/editor-session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const p = await params;
  const invitationId = p.id;
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse('Not Found', { status: 404 }); // Generic safe error
  }

  // Use service role to verify token hash
  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tokenHash = hashEditToken(token);

  const { data: inv, error } = await adminClient
    .from('invitations')
    .select('id, edit_token_hash')
    .eq('id', invitationId)
    .single();

  if (error || !inv) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Token mismatch or missing
  if (!inv.edit_token_hash || inv.edit_token_hash !== tokenHash) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Token is verified! Establish the secure server-side session.
  await setEditorSession(invitationId, token);

  // Redirect to the actual editor without the token in the URL.
  const redirectUrl = new URL(`/editor/${invitationId}`, request.url);
  const response = NextResponse.redirect(redirectUrl, 307);
  
  // Hardening: Prevent Referrer leakage of the original URL containing the secret token
  response.headers.set('Referrer-Policy', 'no-referrer');

  return response;
}
