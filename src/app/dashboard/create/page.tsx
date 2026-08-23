import { createInvitation } from "@/actions/invitations";
import { redirect } from "next/navigation";

export default async function CreateInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const sp = await searchParams;
  
  if (!sp.template) {
    redirect("/templates");
  }

  const result = await createInvitation(sp.template);

  if (result.error || !result.invitationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="text-destructive mb-4 text-4xl">⚠️</div>
          <h1 className="text-xl font-bold mb-4">حدث خطأ</h1>
          <p className="text-muted-foreground mb-6">{result.error || 'تعذر إنشاء الدعوة'}</p>
          <a href="/templates" className="text-primary hover:underline">العودة للقوالب</a>
        </div>
      </div>
    );
  }

  // Redirect to editor
  redirect(`/editor/${result.invitationId}`);
}
