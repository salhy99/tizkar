import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import EditorClient from "./components/EditorClient";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch invitation and its active version (draft)
  const { data: invitation } = await supabase
    .from("invitations")
    .select(`
      *,
      invitation_versions(*),
      templates(*)
    `)
    .eq("id", p.id)
    .eq("user_id", user.id)
    .single() as any;

  if (!invitation) {
    notFound();
  }

  // Ensure there is a draft version
  let draftVersion = invitation.invitation_versions?.find((v: any) => !v.is_published);
  
  if (!draftVersion) {
    // If somehow no draft version exists (should be created by createInvitation action), create one
    // But realistically, Phase 2 expects it to be there.
    notFound();
  }

  return (
    <div className="h-screen overflow-hidden bg-[#FAF8F3]" dir="rtl">
      <EditorClient 
        invitationId={invitation.id}
        initialTitle={invitation.title}
        initialData={draftVersion.invitation_data || {}} 
      />
    </div>
  );
}
