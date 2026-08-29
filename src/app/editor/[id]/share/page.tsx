import { notFound } from "next/navigation";
import { requireInvitationEditAccess } from "@/lib/auth/invitation-auth";
import ShareClient from "./ShareClient";
import { createClient } from "@supabase/supabase-js";
import { getInvitationEntitlements } from "@/lib/entitlements/server";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  
  // 1. Centralized Dual Authorization Check
  const authorizedInv = await requireInvitationEditAccess(p.id);
  
  if (!authorizedInv) {
    notFound();
  }

  // 2. Fetch full invitation data
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL! : process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invitation } = await adminClient
    .from("invitations")
    .select(`
      *,
      templates(*),
      invitation_versions(*)
    `)
    .eq("id", p.id)
    .single();

  if (!invitation) {
    notFound();
  }

  // Check order for payment status
  const { data: order } = await adminClient
    .from('orders')
    .select('id, status')
    .eq('invitation_id', p.id)
    .in('status', ['PENDING_PAYMENT', 'PAID'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { buildPublicInvitationUrl } = await import('@/lib/utils/share');
  const publicUrl = buildPublicInvitationUrl(baseUrl, invitation.slug);

  // Get groom and bride names from draft/published data if possible to formulate share text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeVersion = invitation.invitation_versions?.find((v: { is_published: boolean, invitation_data: any }) => v.is_published) || invitation.invitation_versions?.[0];
  const invData = activeVersion?.invitation_data || {};

  const { entitlements } = await getInvitationEntitlements(p.id);

  return (
    <div className="min-h-screen bg-[#FAF8F3]" dir="rtl">
      <ShareClient 
        invitationId={invitation.id}
        title={invitation.title}
        groomName={invData.groomName || ''}
        brideName={invData.brideName || ''}
        slug={invitation.slug}
        status={invitation.status}
        paymentStatus={order?.status || null}
        publicUrl={publicUrl}
        expiresAt={invitation.expires_at}
        entitlements={entitlements}
      />
    </div>
  );
}
