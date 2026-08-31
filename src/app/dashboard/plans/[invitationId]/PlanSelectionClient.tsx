'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrGetPaymentOrder } from '@/actions/payments'
import { PackageComparison, PlanData } from '@/components/ui/PackageComparison'
import { FunnelTracker } from '@/components/funnel/FunnelTracker'
import { trackFunnelEvent } from '@/lib/funnel/client'

export default function PlanSelectionClient({ 
  invitationId, 
  plans, 
  currentPlanName,
  requiresPremiumTemplate
}: { 
  invitationId: string, 
  plans: PlanData[], 
  currentPlanName?: string,
  requiresPremiumTemplate?: boolean
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSelectPlan = async (plan: PlanData) => {
    if (plan.price === 0) {
      alert('تم استخدام هذه الباقة للمعاينة مسبقاً في المحرر.')
      return
    }

    trackFunnelEvent('FUNNEL_PACKAGE_SELECTED', { invitationId, packageCode: plan.name }, `package_selected_${invitationId}_${plan.name}`)

    setLoadingId(plan.id as string)
    setError('')
    
    const res = await createOrGetPaymentOrder(invitationId, plan.id)
    
    if (res.success && res.data?.id) {
      router.push(`/dashboard/payment/${res.data.id}?invitationId=${invitationId}`)
    } else {
      setError(res.error || 'حدث خطأ غير متوقع')
      setLoadingId(null)
    }
  }

  return (
    <div>
      <FunnelTracker eventName="FUNNEL_PACKAGE_VIEWED" invitationId={invitationId} sourcePage="plans" dedupKey={`package_viewed_${invitationId}`} />
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-xl mb-8 text-center font-bold">
          {error}
        </div>
      )}

      <PackageComparison 
        plans={plans}
        currentPlanName={currentPlanName}
        onSelectPlan={handleSelectPlan}
        loadingId={loadingId}
        requiresPremiumTemplate={requiresPremiumTemplate}
      />
    </div>
  )
}
