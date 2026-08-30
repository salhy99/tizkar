import { requireInvitationEditAccess } from '@/lib/auth/invitation-auth'
import { notFound } from 'next/navigation'
import { getAnalyticsMetrics } from '@/actions/analytics'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import AnalyticsChart from './AnalyticsChart'
import { FeatureGate } from '@/components/ui/FeatureGate'
import { Eye, Users, MousePointerClick, Share2, MapPin, CheckCircle } from 'lucide-react'

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params
  
  // 1. Authorize Owner
  const authorizedInv = await requireInvitationEditAccess(p.id)
  if (!authorizedInv) {
    notFound()
  }

  // 2. Fetch Analytics
  const res = await getAnalyticsMetrics(p.id)

  if (res.error) {
    return (
      <div className="p-8 text-center text-red-500 font-bold" dir="rtl">
        حدث خطأ أثناء تحميل بيانات الإحصائيات.
      </div>
    )
  }

  const isLocked = !!res.locked;
  
  // Dummy data for blurred background if locked
  const metrics = isLocked ? {
    views: 1250,
    uniqueVisitors: 840,
    rsvpResponses: 150,
    conversionRate: 12,
    shareActions: 45,
    mapClicks: 220,
    timeSeries: []
  } : res.metrics!;

  const {
    views,
    uniqueVisitors,
    rsvpResponses,
    conversionRate,
    shareActions,
    mapClicks,
    timeSeries
  } = metrics

  return (
    <FeatureGate 
      isLocked={isLocked} 
      featureName="الإحصائيات المتقدمة" 
      requiredPackage="Plus"
      invitationId={p.id}
    >
      <div className="container mx-auto max-w-5xl p-4 md:p-8 space-y-8" dir="rtl">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#A88952] mb-2 flex items-center gap-3">
            <MousePointerClick className="w-8 h-8" />
            إحصائيات الدعوة
          </h1>
          <p className="text-muted-foreground">مؤشرات تفاعل الضيوف مع دعوتك (قيم تقريبية للمحافظة على الخصوصية)</p>
        </div>
        <Link href={`/editor/${p.id}`}>
          <Button variant="outline">العودة للمحرر</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {/* Metric Cards */}
        <div className="bg-white border border-border rounded-2xl p-6 text-center shadow-sm flex flex-col items-center justify-center">
          <Eye className="w-6 h-6 text-blue-500 mb-2 opacity-80" />
          <div className="text-sm text-muted-foreground mb-1">الزيارات الإجمالية</div>
          <div className="text-3xl font-bold text-[#1C1C1C]">{views}</div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 text-center shadow-sm flex flex-col items-center justify-center">
          <Users className="w-6 h-6 text-purple-500 mb-2 opacity-80" />
          <div className="text-sm text-muted-foreground mb-1">زوار فريدون (تقريبي)</div>
          <div className="text-3xl font-bold text-[#1C1C1C]">{uniqueVisitors}</div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 text-center shadow-sm flex flex-col items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-500 mb-2 opacity-80" />
          <div className="text-sm text-muted-foreground mb-1">تأكيدات الحضور</div>
          <div className="text-3xl font-bold text-[#1C1C1C]">{rsvpResponses}</div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 text-center shadow-sm flex flex-col items-center justify-center">
          <MousePointerClick className="w-6 h-6 text-orange-500 mb-2 opacity-80" />
          <div className="text-sm text-muted-foreground mb-1">معدل التفاعل</div>
          <div className="text-3xl font-bold text-[#1C1C1C]">{conversionRate}%</div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 text-center shadow-sm flex flex-col items-center justify-center">
          <Share2 className="w-6 h-6 text-indigo-500 mb-2 opacity-80" />
          <div className="text-sm text-muted-foreground mb-1">عمليات المشاركة</div>
          <div className="text-3xl font-bold text-[#1C1C1C]">{shareActions}</div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 text-center shadow-sm flex flex-col items-center justify-center">
          <MapPin className="w-6 h-6 text-red-500 mb-2 opacity-80" />
          <div className="text-sm text-muted-foreground mb-1">نقرات الخريطة</div>
          <div className="text-3xl font-bold text-[#1C1C1C]">{mapClicks}</div>
        </div>
      </div>

      {views === 0 ? (
        <div className="bg-white border border-border rounded-3xl p-12 text-center text-muted-foreground">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="text-xl font-bold text-[#1C1C1C] mb-2">لا توجد زيارات مسجلة حتى الآن</h3>
          <p>قم بمشاركة رابط الدعوة لتبدأ في تلقي التفاعلات ورؤية الإحصائيات هنا.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-3xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-[#1C1C1C] mb-6">الزيارات في آخر 7 أيام</h3>
          <div className="h-64 w-full">
            <AnalyticsChart data={timeSeries} />
          </div>
        </div>
      )}

      <div className="text-xs text-center text-muted-foreground pt-4 opacity-70">
        تعتمد الإحصائيات على آليات حماية الخصوصية، ولا يتم تتبع المستخدمين خارج هذه المنصة أو تخزين هوياتهم الشخصية لأغراض إحصائية.
      </div>
    </div>
    </FeatureGate>
  )
}
