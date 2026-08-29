import { notFound } from "next/navigation";
import EditorClient from "./components/EditorClient";
import { requireInvitationEditAccess } from "@/lib/auth/invitation-auth";
import { getInvitationEntitlements } from "@/lib/entitlements/server";
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  
  // 1. Centralized Dual Authorization Check
  await requireInvitationEditAccess(p.id);
  // 2. Fetch invitation and its active version (draft)
  // We use the admin client to bypass RLS because the user might be an anonymous token holder.
  // Authorization is already strictly verified above.
  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invitation } = await adminClient
    .from("invitations")
    .select(`
      *,
      invitation_versions(*),
      templates(*)
    `)
    .eq("id", p.id)
    .single();

  if (!invitation) {
    notFound();
  }

  // The template engine needs the active template slug to resolve the component
  const templateSlug = invitation.templates?.slug;
  
  if (!templateSlug) {
    notFound();
  }

  const draftVersion = invitation.invitation_versions?.find((v: { is_published: boolean }) => !v.is_published);
  
  if (!draftVersion) {
    notFound();
  }

  const { data: order } = await adminClient
    .from('orders')
    .select('id, status')
    .eq('invitation_id', p.id)
    .in('status', ['PENDING_PAYMENT', 'PAID'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const entitlementsState = await getInvitationEntitlements(p.id);

  return (
    <div className="h-screen overflow-hidden bg-[#FAF8F3]" dir="rtl">
      <EditorClient 
        invitationId={invitation.id}
        initialTitle={invitation.title}
        initialData={draftVersion.invitation_data || {}} 
        invitationStatus={invitation.status}
        paymentOrder={order || null}
        hasRecoveryKey={!!invitation.recovery_key_hash}
        templateSlug={invitation.templates?.slug || 'layali'}
        entitlements={entitlementsState.entitlements}
        planName={entitlementsState.planName}
      />
    </div>
  );
}
