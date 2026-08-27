import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "../../components/DashboardHeader";
import InvitationDashboardClient from "./InvitationDashboardClient";

export default async function InvitationDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
    
  const profile = profileRaw as { display_name: string | null } | null;

  const { data: invRaw } = await supabase
    .from('invitations')
    .select('*, event_types(*), templates(*)')
    .eq('id', p.id)
    .single();

  const inv = invRaw as { id: string; user_id: string; slug: string; title: string; status: string; expires_at: string | null; story_image_url: string | null; profiles: { display_name: string } | null; event_types: Record<string, unknown>; templates: Record<string, unknown> } | null;

  if (!inv || inv.user_id !== user.id) notFound();

  // Redirect if not published or expired
  const now = new Date();
  const isExpired = inv.expires_at && new Date(inv.expires_at) < now;
  
  if (inv.status !== 'PUBLISHED' && !isExpired) {
    redirect("/dashboard");
  }

  // Fetch RSVPs
  const { data: rsvps } = await supabase
    .from("rsvp_responses")
    .select("*")
    .eq("invitation_id", inv.id)
    .order("created_at", { ascending: false });

  // Fetch Views Analytics
  const { data: views } = await supabase
    .from("invitation_views")
    .select("viewed_at")
    .eq("invitation_id", inv.id);

  const totalViews = views?.length || 0;
  
  // Calculate date-based stats
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewsToday = views?.filter((v: any) => new Date(v.viewed_at) >= today).length || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewsThisWeek = views?.filter((v: any) => new Date(v.viewed_at) >= weekAgo).length || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewsThisMonth = views?.filter((v: any) => new Date(v.viewed_at) >= monthAgo).length || 0;

  // RSVP Stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confirmed = rsvps?.filter((r: any) => r.status === 'CONFIRMED') || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maybe = rsvps?.filter((r: any) => r.status === 'MAYBE') || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const declined = rsvps?.filter((r: any) => r.status === 'DECLINED') || [];
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalGuests = confirmed.reduce((acc: number, curr: any) => acc + 1 + (curr.companions || 0), 0);

  return (
    <main className="min-h-screen bg-[#FAF8F3]" dir="rtl">
      <DashboardHeader userName={profile?.display_name || user.phone || ""} phone={user.phone!} userId={user.id} />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Link href="/dashboard" className="text-[#A88952] hover:underline text-sm font-bold mb-4 inline-block">
            → العودة للوحة التحكم
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-bold text-[#1C1C1C]">{inv.title}</h1>
              <p className="text-muted-foreground mt-1">إدارة الدعوة وقائمة الحضور</p>
            </div>
            
            <div className="flex gap-2">
              {isExpired ? (
                <div className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold">انتهت الصلاحية</div>
              ) : (
                <div className="bg-green-100 text-green-600 px-4 py-2 rounded-xl font-bold">نشط ومنشور</div>
              )}
            </div>
          </div>
        </div>

        <InvitationDashboardClient 
          inv={inv} 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rsvps={(rsvps as any) || []}
          stats={{
            totalViews,
            viewsToday,
            viewsThisWeek,
            viewsThisMonth,
            confirmed: confirmed.length,
            maybe: maybe.length,
            declined: declined.length,
            totalGuests
          }}
          isExpired={!!isExpired}
        />
      </div>
    </main>
  );
}
