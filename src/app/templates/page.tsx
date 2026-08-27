import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
            const hasTemplates = cat.slug === 'wedding'; // Fallback logic for Phase 1 as requested
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
          {templates?.map((template) => (
            <Link href={`/templates/${template.slug}`} key={template.id} className="group flex flex-col rounded-3xl border border-border bg-white overflow-hidden hover:shadow-xl transition-all duration-300">
              {/* Preview Image Placeholder */}
              <div className="aspect-[9/16] bg-primary/5 relative overflow-hidden flex items-center justify-center">
                {template.is_featured && (
                  <div className="absolute top-4 right-4 bg-primary text-white text-xs px-3 py-1 rounded-full z-10">
                    مميز
                  </div>
                )}
                {/* Visual mockup of the template */}
                <div className="w-[70%] h-[80%] bg-white rounded-xl shadow-lg border border-border/50 flex flex-col items-center justify-center p-4 relative group-hover:scale-105 transition-transform duration-500">
                  <div className="w-full h-full border border-primary/20 rounded-lg flex items-center justify-center text-primary/40 text-xl font-bold font-cairo">
                    {template.name}
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{template.name}</h3>
                    <p className="text-muted-foreground text-sm">{(template.event_types)?.name_ar}</p>
                  </div>
                  <div className="text-primary font-bold">{template.base_price?.toLocaleString()} د.ع</div>
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90">عرض التفاصيل</Button>
              </div>
            </Link>
          ))}
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
