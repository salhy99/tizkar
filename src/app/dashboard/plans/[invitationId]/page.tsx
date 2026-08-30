import { redirect, notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import PlanSelectionClient from './PlanSelectionClient'
import { requireInvitationEditAccess } from '@/lib/auth/invitation-auth'
import { getInvitationEntitlements } from '@/lib/entitlements/server'

export default async function PlansPage({ params }: { params: Promise<{ invitationId: string }> }) {
  const p = await params
  
  const authorizedInv = await requireInvitationEditAccess(p.invitationId)
  if (!authorizedInv) {
    notFound()
  }

  if (authorizedInv.status !== 'DRAFT') {
    // If already pending or published, redirect to dashboard or order status
    redirect('/dashboard')
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: activeVersionRaw } = await adminClient
    .from('invitation_versions')
    .select('invitation_data')
    .eq('invitation_id', p.invitationId)
    .eq('is_published', false)
    .single();

  const { data: invData } = await adminClient
    .from('invitations')
    .select('templates(slug)')
    .eq('id', p.invitationId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templateData = invData?.templates as any;
  const templateSlug = Array.isArray(templateData) ? templateData[0]?.slug : templateData?.slug;
  
  let requiresPremiumTemplate = false;
  if (templateSlug) {
    const { getTemplate } = await import('@/components/templates/registry');
    const registryTemplate = getTemplate(templateSlug);
    if (registryTemplate?.requiredEntitlement === 'premiumTemplates') {
      requiresPremiumTemplate = true;
    }
  }

  const activeVersion = activeVersionRaw as { invitation_data?: { groomName?: string, brideName?: string, date?: string, time?: string } } | null;
  const data = activeVersion?.invitation_data || {};
  const isComplete = data.groomName && data.brideName && data.date && data.time;

  if (!isComplete) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-border max-w-md w-full">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-[#A88952] mb-4">دعوتك تحتاج إلى بعض التفاصيل قبل المتابعة</h2>
          <p className="text-muted-foreground mb-6">يرجى التأكد من ملء الحقول الأساسية (أسماء العرسان، التاريخ، الوقت) في محرر الدعوة.</p>
          <a href={`/editor/${p.invitationId}`}>
            <Button className="w-full bg-[#A88952] hover:bg-[#A88952]/90 text-white rounded-xl">العودة للمحرر</Button>
          </a>
        </div>
      </div>
    )
  }

  // Fetch plans
  const { data: plans } = await adminClient
    .from('plans')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('display_order', { ascending: true });

  const entitlementsState = await getInvitationEntitlements(p.invitationId);

  return (
    <div className="min-h-screen bg-[#FAF8F3] py-16 px-4" dir="rtl">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1C1C1C] mb-4">اختر باقة النشر لدعوتك</h1>
          <p className="text-lg text-muted-foreground">قم بترقية مسودتك لتصبح دعوة فعلية قابلة للمشاركة.</p>
        </div>
        
        <PlanSelectionClient 
          invitationId={p.invitationId} 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          plans={(plans as any) || []} 
          currentPlanName={entitlementsState.planName} 
          requiresPremiumTemplate={requiresPremiumTemplate}
        />
      </div>
    </div>
  )
}
