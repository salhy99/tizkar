import React from 'react';
import { PackageEntitlements, getPackageEntitlements } from '@/lib/entitlements/registry';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export type PlanData = {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
};

type PackageComparisonProps = {
  plans: PlanData[];
  currentPlanName?: string;
  onSelectPlan?: (plan: PlanData) => void;
  loadingId?: string | null;
  requiresPremiumTemplate?: boolean;
};

const PLAN_RANKS: Record<string, number> = {
  'FREE_PREVIEW': 0,
  'BASIC': 1,
  'PLUS': 2,
  'PREMIUM': 3,
};

export const packageCopyMap: Record<keyof PackageEntitlements, string> = {
  analytics: 'إحصائيات الدعوة',
  guestManagementPro: 'إدارة الضيوف المتقدمة',
  premiumTemplates: 'القوالب المميزة',
  removeBranding: 'إزالة علامة تذكار',
  audioAllowed: 'موسيقى خلفية',
  storyExport: 'تصدير ستوري',
  maxImages: 'عدد الصور',
  maxAudioBytes: 'حجم الموسيقى',
  invitationDurationDays: 'مدة الدعوة',
  maxGuestResponses: 'عدد ردود الحضور',
};

export function PackageComparison({ plans, currentPlanName, onSelectPlan, loadingId, requiresPremiumTemplate }: PackageComparisonProps) {
  const currentRank = currentPlanName ? PLAN_RANKS[currentPlanName] ?? -1 : -1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
      {plans.sort((a, b) => (PLAN_RANKS[a.name] ?? 99) - (PLAN_RANKS[b.name] ?? 99)).map((plan) => {
        const entitlements = getPackageEntitlements(plan.name);
        const planRank = PLAN_RANKS[plan.name] ?? 0;
        
        let ctaText = 'اختيار الباقة';
        let ctaAction = 'UPGRADE';
        let isCurrent = false;

        if (currentPlanName && plan.name === currentPlanName) {
          ctaText = 'الباقة الحالية';
          ctaAction = 'CURRENT';
          isCurrent = true;
        } else if (planRank < currentRank) {
          ctaText = 'تخفيض الباقة';
          ctaAction = 'DOWNGRADE';
        } else if (planRank > currentRank) {
          ctaText = 'ترقية';
          ctaAction = 'UPGRADE';
        }

        // Only FREE_PREVIEW has price 0 in our DB
        if (plan.price === 0) {
          isCurrent = currentPlanName === 'FREE_PREVIEW' || !currentPlanName;
          ctaText = isCurrent ? 'مستخدمة حالياً' : 'للمعاينة فقط';
        }

        const isPremium = plan.name === 'PREMIUM';
        const isPlus = plan.name === 'PLUS';

        return (
          <div 
            key={plan.id} 
            className={`bg-white border rounded-3xl p-6 flex flex-col shadow-sm relative transition-all hover:shadow-md ${isPlus ? 'border-[#A88952] ring-2 ring-[#A88952]/20' : 'border-border'} ${isCurrent ? 'opacity-90' : ''}`}
          >
            {isPlus && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#A88952] text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                الأكثر اختياراً
              </div>
            )}
            {isPremium && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                الأكثر اكتمالاً
              </div>
            )}
            
            <div className="mb-4">
              <h3 className={`text-xl font-bold ${isPlus ? 'text-[#A88952]' : isPremium ? 'text-gray-800' : 'text-primary'}`}>{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {plan.price === 0 ? 'للتجربة والمعاينة فقط قبل النشر' : `يشمل نشر الدعوة لمدة ${entitlements.invitationDurationDays || plan.duration_days} يوماً`}
              </p>
              {requiresPremiumTemplate && !isPremium && plan.price > 0 && (
                <div className="mt-3 text-xs font-bold text-red-500 bg-red-50 p-2 rounded border border-red-100">
                  ⚠️ لن تتمكن من نشر الدعوة بهذه الباقة بدون تغيير القالب الحالي
                </div>
              )}
              {requiresPremiumTemplate && isPremium && (
                <div className="mt-3 text-xs font-bold text-green-700 bg-green-50 p-2 rounded border border-green-200">
                  ✓ الباقة المطلوبة لنشر القالب الحالي
                </div>
              )}
            </div>
            
            <div className="my-6">
              <span className="text-3xl font-bold">{plan.price.toLocaleString()}</span>
              <span className="text-muted-foreground mr-1">{plan.currency === 'IQD' ? 'د.ع' : plan.currency}</span>
            </div>
            
            <ul className="space-y-3 mb-8 flex-1 text-sm text-[#1C1C1C]">
              <li>✓ {plan.price === 0 ? 'استخدام المحرر ومعاينة تفاعلية' : 'نشر الدعوة برابط خاص'}</li>
              <li>{plan.price === 0 ? '✗ لا يوجد نشر أو رابط خاص' : '✓ تصميم أنيق متجاوب'}</li>
              
              <li className="flex items-start gap-2">
                <span className="shrink-0">✓</span> 
                <span>{packageCopyMap.maxImages} ({entitlements.maxImages})</span>
              </li>
              
              <li className="flex items-start gap-2">
                <span className="shrink-0">✓</span> 
                <span>{packageCopyMap.maxGuestResponses} ({entitlements.maxGuestResponses === null ? 'غير محدود' : `حتى ${entitlements.maxGuestResponses}`})</span>
              </li>

              <li className={`flex items-start gap-2 ${!entitlements.audioAllowed ? 'text-muted-foreground opacity-60' : ''}`}>
                <span className="shrink-0">{entitlements.audioAllowed ? '✓' : '✗'}</span> 
                <span>{packageCopyMap.audioAllowed}</span>
              </li>

              <li className={`flex items-start gap-2 ${!entitlements.storyExport ? 'text-muted-foreground opacity-60' : ''}`}>
                <span className="shrink-0">{entitlements.storyExport ? '✓' : '✗'}</span> 
                <span>{packageCopyMap.storyExport}</span>
              </li>

              <li className={`flex items-start gap-2 ${!entitlements.guestManagementPro ? 'text-muted-foreground opacity-60' : ''}`}>
                <span className="shrink-0">{entitlements.guestManagementPro ? '✓' : '✗'}</span> 
                <span>{packageCopyMap.guestManagementPro}</span>
              </li>

              <li className={`flex items-start gap-2 ${!entitlements.analytics ? 'text-muted-foreground opacity-60' : ''}`}>
                <span className="shrink-0">{entitlements.analytics ? '✓' : '✗'}</span> 
                <span>{packageCopyMap.analytics}</span>
              </li>

              <li className={`flex items-start gap-2 ${!entitlements.premiumTemplates ? 'text-muted-foreground opacity-60' : ''}`}>
                <span className="shrink-0">{entitlements.premiumTemplates ? '✓' : '✗'}</span> 
                <span>{packageCopyMap.premiumTemplates}</span>
              </li>

              <li className={`flex items-start gap-2 ${!entitlements.removeBranding ? 'text-muted-foreground opacity-60' : ''}`}>
                <span className="shrink-0">{entitlements.removeBranding ? '✓' : '✗'}</span> 
                <span>{packageCopyMap.removeBranding}</span>
              </li>
            </ul>
            
            {onSelectPlan ? (
              <Button 
                onClick={() => plan.price > 0 && !isCurrent && onSelectPlan(plan)}
                disabled={loadingId === plan.id || isCurrent || plan.price === 0 || ctaAction === 'DOWNGRADE'}
                variant={isCurrent ? 'outline' : 'default'}
                className={`w-full h-12 text-lg rounded-xl ${isPlus && !isCurrent ? 'bg-[#A88952] hover:bg-[#A88952]/90 text-white shadow-lg shadow-[#A88952]/20' : ''} ${isPremium && !isCurrent ? 'bg-gray-800 hover:bg-gray-700 text-white' : ''}`}
              >
                {loadingId === plan.id ? 'جاري التحضير...' : ctaText}
              </Button>
            ) : (
              <Link href="/templates" className="block w-full">
                <Button 
                  variant="default"
                  className={`w-full h-12 text-lg rounded-xl ${isPlus ? 'bg-[#A88952] hover:bg-[#A88952]/90 text-white shadow-lg shadow-[#A88952]/20' : ''} ${isPremium ? 'bg-gray-800 hover:bg-gray-700 text-white' : ''}`}
                >
                  {plan.price === 0 ? 'جرب الآن مجاناً' : 'اشترك الآن'}
                </Button>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
