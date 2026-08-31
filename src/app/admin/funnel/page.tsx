import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function AdminFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const sp = await searchParams
  const days = parseInt(sp.days || '7', 10)
  
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  
  // Fetch raw events for the period
  const { data: events, error } = await adminClient
    .from('product_funnel_events')
    .select('*')
    .gte('created_at', cutoff.toISOString())
    .eq('is_synthetic', false)
    .order('created_at', { ascending: true })

  if (error) {
    return <div>Error loading telemetry data</div>
  }

  // Define aggregations
  const uniqueSessions = new Set<string>()
  const landingSessions = new Set<string>()
  const catalogSessions = new Set<string>()
  const detailSessions = new Set<string>()
  const templateSelections = new Set<string>()
  
  const drafts = new Set<string>()
  const editorsOpened = new Set<string>()
  const editorsEdited = new Set<string>()
  
  const packageViews = new Set<string>()
  const packageSelections = new Set<string>()
  const ordersCreated = new Set<string>()
  const whatsappClicks = new Set<string>()
  
  const paymentsConfirmed = new Set<string>()
  const publishAttempts = new Set<string>()
  const published = new Set<string>()

  const templatePerformance: Record<string, { views: Set<string>, selects: Set<string>, drafts: Set<string> }> = {}
  const packagePerformance: Record<string, { views: Set<string>, selects: Set<string>, orders: Set<string>, paid: Set<string> }> = {}

  for (const ev of events || []) {
    uniqueSessions.add(ev.session_id)

    switch(ev.event_name) {
      case 'FUNNEL_LANDING_VIEW': landingSessions.add(ev.session_id); break;
      case 'FUNNEL_TEMPLATE_CATALOG_VIEW': catalogSessions.add(ev.session_id); break;
      case 'FUNNEL_TEMPLATE_DETAIL_VIEW': 
        detailSessions.add(ev.session_id)
        if (ev.template_slug) {
          if (!templatePerformance[ev.template_slug]) templatePerformance[ev.template_slug] = { views: new Set(), selects: new Set(), drafts: new Set() }
          templatePerformance[ev.template_slug].views.add(ev.session_id)
        }
        break;
      case 'FUNNEL_TEMPLATE_SELECTED': 
        templateSelections.add(ev.session_id)
        if (ev.template_slug) {
          if (!templatePerformance[ev.template_slug]) templatePerformance[ev.template_slug] = { views: new Set(), selects: new Set(), drafts: new Set() }
          templatePerformance[ev.template_slug].selects.add(ev.session_id)
        }
        break;
      case 'FUNNEL_DRAFT_CREATED': 
        if (ev.invitation_id) drafts.add(ev.invitation_id)
        if (ev.template_slug && ev.invitation_id) {
          if (!templatePerformance[ev.template_slug]) templatePerformance[ev.template_slug] = { views: new Set(), selects: new Set(), drafts: new Set() }
          templatePerformance[ev.template_slug].drafts.add(ev.invitation_id)
        }
        break;
      case 'FUNNEL_EDITOR_OPENED': if (ev.invitation_id) editorsOpened.add(ev.invitation_id); break;
      case 'FUNNEL_EDITOR_EDITED': if (ev.invitation_id) editorsEdited.add(ev.invitation_id); break;
      case 'FUNNEL_PACKAGE_VIEWED': if (ev.invitation_id) packageViews.add(ev.invitation_id); break;
      
      case 'FUNNEL_PACKAGE_SELECTED': 
        if (ev.invitation_id) packageSelections.add(ev.invitation_id)
        if (ev.package_code) {
          if (!packagePerformance[ev.package_code]) packagePerformance[ev.package_code] = { views: new Set(), selects: new Set(), orders: new Set(), paid: new Set() }
          packagePerformance[ev.package_code].selects.add(ev.invitation_id)
        }
        break;
        
      case 'FUNNEL_PAYMENT_ORDER_CREATED': 
        if (ev.event_key) ordersCreated.add(ev.event_key)
        if (ev.package_code && ev.event_key) {
          if (!packagePerformance[ev.package_code]) packagePerformance[ev.package_code] = { views: new Set(), selects: new Set(), orders: new Set(), paid: new Set() }
          packagePerformance[ev.package_code].orders.add(ev.event_key)
        }
        break;
        
      case 'FUNNEL_WHATSAPP_CLICKED': if (ev.event_key) whatsappClicks.add(ev.event_key); break;
      
      case 'FUNNEL_PAYMENT_CONFIRMED': 
        if (ev.event_key) paymentsConfirmed.add(ev.event_key)
        if (ev.package_code && ev.event_key) {
          if (!packagePerformance[ev.package_code]) packagePerformance[ev.package_code] = { views: new Set(), selects: new Set(), orders: new Set(), paid: new Set() }
          packagePerformance[ev.package_code].paid.add(ev.event_key)
        }
        break;
        
      case 'FUNNEL_PUBLISH_ATTEMPTED': if (ev.invitation_id) publishAttempts.add(ev.invitation_id); break;
      case 'FUNNEL_PUBLISHED': if (ev.invitation_id) published.add(ev.invitation_id); break;
    }
  }

  const funnelData = {
    days,
    metrics: {
      landingSessions: landingSessions.size,
      catalogSessions: catalogSessions.size,
      detailSessions: detailSessions.size,
      templateSelections: templateSelections.size,
      drafts: drafts.size,
      editorsOpened: editorsOpened.size,
      editorsEdited: editorsEdited.size,
      packageViews: packageViews.size,
      packageSelections: packageSelections.size,
      ordersCreated: ordersCreated.size,
      whatsappClicks: whatsappClicks.size,
      paymentsConfirmed: paymentsConfirmed.size,
      publishAttempts: publishAttempts.size,
      published: published.size,
      uniqueSessions: uniqueSessions.size
    },
    templateData: Object.entries(templatePerformance).map(([slug, data]) => ({
      slug,
      views: data.views.size,
      selects: data.selects.size,
      drafts: data.drafts.size
    })),
    packageData: Object.entries(packagePerformance).map(([code, data]) => ({
      code,
      selects: data.selects.size,
      orders: data.orders.size,
      paid: data.paid.size
    }))
  }

  const { FunnelDashboardClient } = await import('./FunnelDashboardClient')
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-[#1C1C1C]">تحليل مسار التحويل</h1>
      <FunnelDashboardClient data={funnelData} />
    </div>
  )
}
