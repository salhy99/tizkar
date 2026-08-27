import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "./components/DashboardHeader";
import { BarChart3, Calendar, Eye, Clock } from "lucide-react";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as { display_name: string | null } | null;

  // Fetch invitations
  const { data: invitations } = await supabase
    .from("invitations")
    .select("*, event_types(*), templates(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: orders } = await supabase
    .from("orders")
    .select("id, invitation_id, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Derive stats
  const totalInvs = invitations?.length || 0;
  
  // Calculate expiration logically
  const now = new Date();
  
  let publishedCount = 0;
  let pendingCount = 0;
  let expiredCount = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- complex supabase data
  const enrichedInvitations = invitations?.map((inv: any) => {
    let effectiveStatus = inv.status;
    if (inv.status === 'PUBLISHED' && inv.expires_at && new Date(inv.expires_at) < now) {
      effectiveStatus = 'EXPIRED';
    }

    if (effectiveStatus === 'PUBLISHED') publishedCount++;
    if (effectiveStatus === 'PENDING_APPROVAL' || effectiveStatus === 'PENDING_PAYMENT') pendingCount++;
    if (effectiveStatus === 'EXPIRED') expiredCount++;

    return { ...inv, effectiveStatus };
  }) || [];

  return (
    <main className="min-h-screen bg-[#FAF8F3]" dir="rtl">
      <DashboardHeader userName={profile?.display_name || user.phone || ""} phone={user.phone!} userId={user.id} />

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">مرحباً بك في تِذكار 👋</h2>
            <p className="text-muted-foreground text-lg">نظرة عامة على دعواتك ونشاطاتك.</p>
          </div>
          <Link href="/templates" className="mt-6 md:mt-0">
            <Button size="lg" className="bg-[#A88952] hover:bg-[#A88952]/90 text-white shadow-lg rounded-xl text-lg h-14 px-8">
              + إنشاء دعوة جديدة
            </Button>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <div className="text-muted-foreground mb-2 flex items-center gap-2"><Calendar className="w-4 h-4"/> إجمالي الدعوات</div>
            <div className="text-3xl font-bold">{totalInvs}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <div className="text-muted-foreground mb-2 flex items-center gap-2"><Eye className="w-4 h-4"/> الدعوات المنشورة</div>
            <div className="text-3xl font-bold text-green-600">{publishedCount}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <div className="text-muted-foreground mb-2 flex items-center gap-2"><Clock className="w-4 h-4"/> قيد المراجعة</div>
            <div className="text-3xl font-bold text-orange-500">{pendingCount}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <div className="text-muted-foreground mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4"/> الدعوات المنتهية</div>
            <div className="text-3xl font-bold text-red-500">{expiredCount}</div>
          </div>
        </div>

        {/* Invitations List */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold">إدارة الدعوات</h3>
          
          {enrichedInvitations.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-border flex flex-col items-center shadow-sm">
              <div className="w-20 h-20 bg-[#A88952]/10 text-[#A88952] rounded-full flex items-center justify-center mb-6 text-3xl">
                ✉️
              </div>
              <h4 className="text-xl font-bold mb-2">لا توجد دعوات حتى الآن</h4>
              <p className="text-muted-foreground mb-8">ابدأ بتصميم دعوتك الأولى وشارك الفرحة مع أحبابك.</p>
              <Link href="/templates">
                <Button className="bg-[#A88952] hover:bg-[#A88952]/90 rounded-xl px-8 h-12 text-lg">تصفح القوالب</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- complex supabase data */}
              {enrichedInvitations.map((inv: any) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- complex supabase data
                const invOrders = (orders as any[] || []).filter((o: Record<string, unknown>) => o.invitation_id === inv.id);
                const latestOrder = invOrders[0];
                const status = inv.effectiveStatus;

                return (
                  <div key={inv.id as string} className="bg-white rounded-3xl p-6 border border-border shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-[#FAF8F3] text-[#A88952] text-xs font-bold px-3 py-1 rounded-full border border-[#A88952]/20">
                        {inv.event_types?.name_ar}
                      </div>
                      
                      {/* Status Badges */}
                      {status === 'DRAFT' && <div className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-200">مسودة</div>}
                      {status === 'PENDING_PAYMENT' && <div className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-200">بانتظار الدفع</div>}
                      {status === 'PENDING_APPROVAL' && <div className="text-xs font-bold bg-orange-50 text-orange-600 px-3 py-1 rounded-full border border-orange-200">قيد المراجعة</div>}
                      {status === 'PUBLISHED' && <div className="text-xs font-bold bg-green-50 text-green-600 px-3 py-1 rounded-full border border-green-200 shadow-sm">منشورة</div>}
                      {status === 'REJECTED' && <div className="text-xs font-bold bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-200">مرفوضة</div>}
                      {status === 'EXPIRED' && <div className="text-xs font-bold bg-gray-800 text-white px-3 py-1 rounded-full shadow-sm">منتهية</div>}
                    </div>
                    
                    <h4 className="text-xl font-bold mb-1 truncate text-[#1C1C1C]">{inv.title}</h4>
                    <p className="text-muted-foreground text-sm flex-grow mb-4">
                      قالب: {inv.templates?.name}
                    </p>

                    {status === 'PUBLISHED' && (
                      <div className="bg-[#FAF8F3] p-3 rounded-xl mb-4 text-xs space-y-2 border border-[#A88952]/10">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">تاريخ النشر:</span>
                          <span className="font-bold">{new Date(inv.published_at).toLocaleDateString('en-GB')}</span>
                        </div>
                        <div className="flex justify-between text-[#A88952]">
                          <span className="text-muted-foreground">تاريخ الانتهاء:</span>
                          <span className="font-bold">{new Date(inv.expires_at).toLocaleDateString('en-GB')}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-2 pt-4 border-t border-border">
                      
                      {status === 'DRAFT' && (
                        <>
                          <Link href={`/editor/${inv.id}`}>
                            <Button variant="outline" className="w-full rounded-xl border-[#A88952] text-[#A88952] hover:bg-[#A88952] hover:text-white h-12">
                              تعديل الدعوة
                            </Button>
                          </Link>
                          <Link href={`/dashboard/plans/${inv.id}`}>
                            <Button className="w-full rounded-xl bg-[#1C1C1C] hover:bg-[#1C1C1C]/90 text-white h-12">
                              متابعة النشر
                            </Button>
                          </Link>
                        </>
                      )}

                      {status === 'PENDING_PAYMENT' && latestOrder && (
                        <Link href={`/dashboard/payment/${latestOrder.id}`}>
                          <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white h-12">
                            إتمام عملية الدفع
                          </Button>
                        </Link>
                      )}

                      {status === 'PENDING_APPROVAL' && (
                        <Button disabled variant="outline" className="w-full rounded-xl opacity-70 h-12">
                          قيد المراجعة من الإدارة
                        </Button>
                      )}

                      {status === 'REJECTED' && (
                        <Link href={`/dashboard/plans/${inv.id}`}>
                          <Button className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white h-12">
                            إعادة تقديم الطلب
                          </Button>
                        </Link>
                      )}

                      {status === 'PUBLISHED' && (
                        <>
                          <Link href={`/dashboard/invitation/${inv.id}`}>
                            <Button className="w-full rounded-xl bg-[#A88952] hover:bg-[#A88952]/90 text-white h-12">
                              إدارة الدعوة والحضور
                            </Button>
                          </Link>
                          <a href={`/${inv.slug}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="w-full rounded-xl h-12 flex items-center justify-center gap-2">
                              <Eye className="w-4 h-4" /> عرض الدعوة
                            </Button>
                          </a>
                        </>
                      )}

                      {status === 'EXPIRED' && (
                        <Link href={`/dashboard/plans/${inv.id}`}>
                          <Button className="w-full rounded-xl bg-gray-800 hover:bg-gray-900 text-white h-12">
                            تجديد الدعوة
                          </Button>
                        </Link>
                      )}

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
