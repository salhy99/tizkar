import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PackageComparison } from "@/components/ui/PackageComparison";
import { createClient } from "@/lib/supabase/server";
import { FunnelTracker } from "@/components/funnel/FunnelTracker";

export default async function Home() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('display_order', { ascending: true });
  return (
    <main className="flex min-h-screen flex-col items-center">
      <FunnelTracker eventName="FUNNEL_LANDING_VIEW" sourcePage="landing" dedupKey="landing_view" />
      {/* Navbar Placeholder */}
      <header className="w-full border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="text-3xl font-bold text-primary">تِذكار</div>
          <nav className="hidden md:flex gap-8 items-center text-muted-foreground font-medium">
            <Link href="/" className="text-foreground transition-colors hover:text-primary">الرئيسية</Link>
            <Link href="/templates" className="transition-colors hover:text-primary">القوالب</Link>
            <Link href="#features" className="transition-colors hover:text-primary">المميزات</Link>
            <Link href="#pricing" className="transition-colors hover:text-primary">الباقات</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">تسجيل الدخول</Button>
            </Link>
            <Link href="/templates">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">أنشئ دعوتك</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full py-24 md:py-32 flex flex-col items-center text-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10"></div>
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
            فرحتك إلها حكاية...<br />
            <span className="text-primary">خلّها تبدأ بدعوة تِذكار.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            صمّم دعوتك الإلكترونية، خصص تفاصيلها، شاركها ويا أحبابك وتابع تأكيد حضورهم بكل سهولة.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/templates">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-primary text-primary-foreground hover:bg-primary/90">
                تصفح القوالب
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg border-2">
                أنشئ دعوتك
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Occasions / Categories Placeholder */}
      <section className="w-full py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12">لكل مناسبة تِذكار</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto">
            {['زواج', 'خطوبة', 'عقد قران', 'تخرج'].map((cat, i) => (
              <Link href={`/templates?category=${cat}`} key={i} className="group p-6 rounded-2xl border border-border bg-background hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                <div className="text-2xl font-semibold group-hover:text-primary transition-colors">{cat}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full py-24 bg-[#FAF8F3]" id="features">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">كيف تعمل تِذكار؟</h2>
            <p className="text-xl text-muted-foreground">خطوات بسيطة لدعوة تبقى بالذكرى</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { title: "اختار القالب", desc: "تصفح مجموعة من القوالب المصممة بعناية" },
              { title: "صمّم دعوتك", desc: "أضف تفاصيل مناسبتك، صورك، والموسيقى المفضلة" },
              { title: "ادفع وفعّل دعوتك", desc: "باقات تناسب ميزانيتك مع تفعيل فوري" },
              { title: "شاركها ويا أحبابك", desc: "احصل على رابط خاص وشاركه عبر واتساب" }
            ].map((step, i) => (
              <div key={i} className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Placeholder */}
      <section className="w-full py-24 bg-white" id="pricing">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">باقات تِذكار</h2>
          <p className="text-xl text-muted-foreground mb-16">دعوتك فعّالة لمدة 120 يومًا</p>
          
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <PackageComparison plans={(plans as any) || []} />
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 bg-[#181818] text-white/70 text-center">
        <div className="text-2xl font-bold text-white mb-6">تِذكار</div>
        <p className="mb-6">تِذكار — دعوة تبقى بالذكرى.</p>
        <p className="text-sm">© {new Date().getFullYear()} تِذكار. جميع الحقوق محفوظة.</p>
      </footer>
    </main>
  );
}
