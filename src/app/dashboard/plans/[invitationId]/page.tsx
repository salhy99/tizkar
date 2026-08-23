import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import PlanSelectionClient from './PlanSelectionClient'

export default async function PlansPage({ params }: { params: Promise<{ invitationId: string }> }) {
  const p = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify invitation ownership and completeness
  const { data: inv } = await supabase
    .from('invitations')
    .select('id, user_id, status, title')
    .eq('id', p.invitationId)
    .single() as any;

  if (!inv || inv.user_id !== user.id) {
    notFound()
  }

  if (inv.status !== 'DRAFT') {
    // If already pending or published, redirect to dashboard or order status
    redirect('/dashboard')
  }

  const { data: activeVersion } = await supabase
    .from('invitation_versions')
    .select('invitation_data')
    .eq('invitation_id', p.invitationId)
    .eq('is_published', false)
    .single() as any;

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
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('display_order', { ascending: true }) as any;

  return (
    <div className="min-h-screen bg-[#FAF8F3] py-16 px-4" dir="rtl">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1C1C1C] mb-4">اختر باقة النشر لدعوتك</h1>
          <p className="text-lg text-muted-foreground">قم بترقية مسودتك لتصبح دعوة فعلية قابلة للمشاركة.</p>
        </div>
        
        <PlanSelectionClient invitationId={p.invitationId} plans={plans || []} />
      </div>
    </div>
  )
}
