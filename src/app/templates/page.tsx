import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { templatesRegistry } from "@/components/templates/registry";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const supabase = await createClient();
  const sp = await searchParams;
  
  // Fetch event types (categories)
  const { data: eventTypesData } = await supabase
    .from("event_types")
    .select("*")
    .order("display_order");
  
  const eventTypes = eventTypesData as { id: string; name_ar: string; slug: string }[] | null;

  // Fetch templates based on category
  let query = supabase.from("templates").select("*, event_types(*)");
  
  if (sp.category) {
    const selectedCategory = eventTypes?.find((e) => e.name_ar === sp.category || e.slug === sp.category);
    if (selectedCategory) {
      query = query.eq("event_type_id", selectedCategory.id);
    }
  }

  const { data: templatesData } = await query.eq("status", "ACTIVE");
  const templates = templatesData as { id: string; name: string; slug: string; description: string; base_price: number; is_featured: boolean; event_types: { name_ar: string } }[] | null;

  return (
    <main className="min-h-screen bg-[#FAF8F3] py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-border pb-6">
          <div>
            <h1 className="text-4xl font-bold mb-4">قوالب تِذكار</h1>
            <p className="text-muted-foreground text-lg">اختر القالب المناسب لمناسبتك وابدأ بتصميمه</p>
          </div>
          <Link href="/">
            <Button variant="ghost">العودة للرئيسية</Button>
          </Link>
        </div>

        {/* Categories Filter */}
        <div className="flex flex-wrap gap-2 mb-12">
          <Link href="/templates">
            <Button variant={!sp.category ? "default" : "outline"} className="rounded-full">
              الكل
            </Button>
          </Link>
          {eventTypes?.map((cat) => {
            const hasTemplates = cat.slug === 'wedding';
            return (
              <Link key={cat.id} href={hasTemplates ? `/templates?category=${cat.slug}` : "#"} className={!hasTemplates ? "cursor-not-allowed opacity-50" : ""}>
                <Button 
                  variant={sp.category === cat.slug ? "default" : "outline"} 
                  className="rounded-full"
                  disabled={!hasTemplates}
                >
                  {cat.name_ar} {!hasTemplates && "(قريباً)"}
                </Button>
              </Link>
            )
          })}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {templates?.map((template) => {
            const registryEntry = templatesRegistry[template.slug]
            const isPremium = registryEntry?.requiredEntitlement === 'premiumTemplates'

            return (
              <Link
                href={`/templates/${template.slug}`}
                key={template.id}
                className="group flex flex-col rounded-3xl border border-border bg-white overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                {/* Preview area */}
                <div className={`aspect-[9/16] relative overflow-hidden flex items-center justify-center ${isPremium ? 'bg-[#0E0B08]' : 'bg-primary/5'}`}>
                  {/* Premium badge */}
                  {isPremium && (
                    <div className="absolute top-4 right-4 z-10">
                      <PremiumBadge />
                    </div>
                  )}

                  {/* Featured badge (non-premium) */}
                  {template.is_featured && !isPremium && (
                    <div className="absolute top-4 right-4 bg-primary text-white text-xs px-3 py-1 rounded-full z-10">
                      مميز
                    </div>
                  )}

                  {/* Template visual mockup */}
                  {isPremium ? (
                    /* Dark premium preview */
                    <div className="w-[70%] h-[80%] rounded-xl shadow-lg flex flex-col items-center justify-center p-4 relative group-hover:scale-105 transition-transform duration-500"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(192,160,98,0.2)' }}
                    >
                      <div className="text-[#C0A062] text-xl font-bold font-cairo opacity-80">{template.name}</div>
                      <div className="mt-2 text-[#C0A062]/40 text-xs">حصري • PREMIUM</div>
                    </div>
                  ) : (
                    /* Standard preview */
                    <div className="w-[70%] h-[80%] bg-white rounded-xl shadow-lg border border-border/50 flex flex-col items-center justify-center p-4 relative group-hover:scale-105 transition-transform duration-500">
                      <div className="w-full h-full border border-primary/20 rounded-lg flex items-center justify-center text-primary/40 text-xl font-bold font-cairo">
                        {template.name}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card info */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{template.name}</h3>
                      <p className="text-muted-foreground text-sm">{(template.event_types)?.name_ar}</p>
                    </div>
                    <div className="text-primary font-bold">{template.base_price?.toLocaleString()} د.ع</div>
                  </div>

                  {isPremium ? (
                    /* Premium CTA */
                    <div className="w-full h-10 rounded-xl flex items-center justify-center text-sm font-medium gap-2"
                      style={{ background: 'rgba(192,160,98,0.08)', color: '#9A7A42', border: '1px solid rgba(192,160,98,0.25)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      قالب حصري — عرض التفاصيل
                    </div>
                  ) : (
                    <Button className="w-full bg-primary hover:bg-primary/90">عرض التفاصيل</Button>
                  )}
                </div>
              </Link>
            )
          })}
          {(!templates || templates.length === 0) && (
            <div className="col-span-full py-20 text-center text-muted-foreground">
              لا توجد قوالب متاحة حالياً في هذا القسم.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
