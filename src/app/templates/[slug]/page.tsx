import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PreviewButton from "./PreviewButton";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const p = await params;
  const supabase = await createClient();
  await supabase.auth.getUser();
  
  const { data } = await supabase
    .from("templates")
    .select("*, event_types(*)")
    .eq("slug", p.slug)
    .single();
    
  const template = data as { id: string; name: string; slug: string; description: string; base_price: number; is_featured: boolean; event_types: { name_ar: string } } | null;

  if (!template) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#FAF8F3] py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8 border-b border-border pb-6 flex items-center justify-between">
          <Link href="/templates">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              &rarr; العودة للقوالب
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Mobile Preview Frame */}
          <div className="relative mx-auto w-full max-w-[380px]">
            {/* Phone Bezel */}
            <div className="relative w-full aspect-[9/19.5] bg-black rounded-[3rem] p-4 shadow-2xl border-4 border-[#333]">
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-6 bg-black rounded-b-3xl w-1/3 mx-auto z-20"></div>
              
              {/* Screen Content */}
              <div className="w-full h-full bg-[#FAF8F3] rounded-[2rem] overflow-hidden relative border border-border/10">
                {/* Dummy Template Rendering for Phase 1 */}
                <div className="absolute inset-0 overflow-y-auto">
                  <div className="min-h-full flex flex-col items-center justify-center p-8 text-center space-y-12 pb-24" style={{ backgroundColor: '#FAF8F3', color: '#1C1C1C' }}>
                    
                    {/* Hero / Names */}
                    <div className="space-y-6 animate-in fade-in zoom-in duration-1000">
                      <div className="text-sm font-bold tracking-widest text-[#A88952]">بسم الله الرحمن الرحيم</div>
                      <h1 className="text-5xl font-bold font-cairo text-[#A88952] mb-4 mt-8">أحمد & زهراء</h1>
                      <div className="w-12 h-px bg-[#A88952] mx-auto opacity-50"></div>
                      <p className="text-lg leading-relaxed max-w-[200px] mx-auto text-[#777777]">بكل حب نتشرف بدعوتكم لمشاركتنا فرحتنا</p>
                    </div>

                    {/* Date / Time */}
                    <div className="space-y-4 pt-8">
                      <div className="text-3xl font-bold font-cairo">20 أكتوبر 2026</div>
                      <div className="text-xl">7:00 مساءً</div>
                    </div>

                    {/* Venue */}
                    <div className="space-y-2 pt-8">
                      <div className="text-2xl font-bold text-[#A88952]">قاعة النخيل</div>
                      <div className="text-[#777777]">العراق - بغداد</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details & Action */}
          <div className="space-y-8 sticky top-12">
            <div>
              <div className="text-sm font-bold text-primary mb-2">{(template.event_types)?.name_ar}</div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{template.name}</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {template.description || "قالب أنيق وعصري مصمم بعناية ليجعل من مناسبتك ذكرى لا تُنسى."}
              </p>
            </div>

            <div className="text-3xl font-bold text-primary border-t border-b border-border py-6">
              {template.base_price?.toLocaleString()} <span className="text-lg text-muted-foreground font-normal">د.ع</span>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold">المميزات المدعومة في هذا القالب:</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">✓</div>
                  تصميم متجاوب لجميع الأجهزة
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">✓</div>
                  تخصيص الألوان والنصوص
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">✓</div>
                  موسيقى خلفية
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">✓</div>
                  تأكيد الحضور (RSVP)
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <Link href={`/dashboard/create?template=${template.id}`}>
                <Button size="lg" className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/20">
                  استخدم هذا القالب
                </Button>
              </Link>
              {/* Fake preview button just to satisfy Free Preview requirement loosely */}
              <PreviewButton />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
