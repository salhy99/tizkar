'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type FunnelData = {
  days: number;
  metrics: {
    landingSessions: number;
    catalogSessions: number;
    detailSessions: number;
    templateSelections: number;
    drafts: number;
    editorsOpened: number;
    editorsEdited: number;
    packageViews: number;
    packageSelections: number;
    ordersCreated: number;
    whatsappClicks: number;
    paymentsConfirmed: number;
    publishAttempts: number;
    published: number;
    uniqueSessions: number;
  };
  templateData: { slug: string; views: number; selects: number; drafts: number }[];
  packageData: { code: string; selects: number; orders: number; paid: number }[];
};

export function FunnelDashboardClient({ data }: { data: FunnelData }) {
  const router = useRouter();

  const handlePeriodChange = (days: number) => {
    router.push(`/admin/funnel?days=${days}`);
  };

  const { metrics, templateData, packageData } = data;

  // Activation Metric: Editors Edited / Drafts Created
  const activationRate = metrics.drafts > 0 ? ((metrics.editorsEdited / metrics.drafts) * 100).toFixed(1) : '0.0';
  
  // Paid to Publish Rate
  const publishRate = metrics.paymentsConfirmed > 0 ? ((metrics.published / metrics.paymentsConfirmed) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-8">
      {/* Date Filters */}
      <div className="flex gap-4">
        <Button 
          variant={data.days === 1 ? 'default' : 'outline'} 
          onClick={() => handlePeriodChange(1)}
        >
          اليوم
        </Button>
        <Button 
          variant={data.days === 7 ? 'default' : 'outline'} 
          onClick={() => handlePeriodChange(7)}
        >
          آخر 7 أيام
        </Button>
        <Button 
          variant={data.days === 30 ? 'default' : 'outline'} 
          onClick={() => handlePeriodChange(30)}
        >
          آخر 30 يوم
        </Button>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="إجمالي الجلسات" value={metrics.uniqueSessions} />
        <MetricCard title="المسودات (دعوات)" value={metrics.drafts} subtitle={`مفعلة: ${metrics.editorsEdited} (${activationRate}%)`} />
        <MetricCard title="الطلبات المدفوعة" value={metrics.paymentsConfirmed} />
        <MetricCard title="دعوات منشورة" value={metrics.published} subtitle={`من المدفوعة: ${publishRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Session Funnel */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
          <h2 className="text-xl font-bold mb-6">مسار الجلسات (Sessions)</h2>
          <div className="space-y-4">
            <FunnelStep label="زيارات البداية" value={metrics.landingSessions} max={metrics.landingSessions || 1} />
            <FunnelStep label="استعراض القوالب" value={metrics.catalogSessions} max={metrics.landingSessions || 1} />
            <FunnelStep label="مشاهدة تفاصيل قالب" value={metrics.detailSessions} max={metrics.landingSessions || 1} />
            <FunnelStep label="اختيار القالب" value={metrics.templateSelections} max={metrics.landingSessions || 1} />
          </div>
        </div>

        {/* Invitation Funnel */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
          <h2 className="text-xl font-bold mb-6">مسار الدعوات (Invitations)</h2>
          <div className="space-y-4">
            <FunnelStep label="إنشاء المسودة" value={metrics.drafts} max={metrics.drafts || 1} />
            <FunnelStep label="بدأوا التخصيص (مفعلة)" value={metrics.editorsEdited} max={metrics.drafts || 1} />
            <FunnelStep label="مشاهدة الباقات" value={metrics.packageViews} max={metrics.drafts || 1} />
            <FunnelStep label="طلبات الدفع" value={metrics.ordersCreated} max={metrics.drafts || 1} />
            <FunnelStep label="تم الدفع" value={metrics.paymentsConfirmed} max={metrics.drafts || 1} />
            <FunnelStep label="تم النشر" value={metrics.published} max={metrics.drafts || 1} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* WhatsApp Drop-off */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
          <h2 className="text-xl font-bold mb-6">مسار دفع واتساب</h2>
          <div className="space-y-4">
            <FunnelStep label="طلبات الدفع" value={metrics.ordersCreated} max={metrics.ordersCreated || 1} color="bg-blue-500" />
            <FunnelStep label="فتح واتساب" value={metrics.whatsappClicks} max={metrics.ordersCreated || 1} color="bg-green-500" />
            <FunnelStep label="تأكيد الدفع" value={metrics.paymentsConfirmed} max={metrics.ordersCreated || 1} color="bg-yellow-500" />
          </div>
        </div>

        {/* Abandonment States */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
          <h2 className="text-xl font-bold mb-6">حالات التخلي (Abandonment)</h2>
          <ul className="space-y-3">
            <li className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">تصفح بدون إنشاء مسودة</span>
              <span className="font-bold">{metrics.catalogSessions - metrics.drafts > 0 ? metrics.catalogSessions - metrics.drafts : 0}</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">مسودة بدون تفعيل (تعديل)</span>
              <span className="font-bold">{metrics.drafts - metrics.editorsEdited > 0 ? metrics.drafts - metrics.editorsEdited : 0}</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">طلب بدون دفع</span>
              <span className="font-bold">{metrics.ordersCreated - metrics.paymentsConfirmed > 0 ? metrics.ordersCreated - metrics.paymentsConfirmed : 0}</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm overflow-x-auto">
          <h2 className="text-xl font-bold mb-6">أداء القوالب</h2>
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-3 pr-2 font-normal">القالب</th>
                <th className="pb-3 font-normal">مشاهدات</th>
                <th className="pb-3 font-normal">اختيارات</th>
                <th className="pb-3 font-normal">مسودات</th>
              </tr>
            </thead>
            <tbody>
              {templateData.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">لا توجد بيانات</td></tr>}
              {templateData.map(t => (
                <tr key={t.slug} className="border-b last:border-0">
                  <td className="py-3 pr-2 font-bold" dir="ltr">{t.slug}</td>
                  <td className="py-3">{t.views}</td>
                  <td className="py-3">{t.selects}</td>
                  <td className="py-3">{t.drafts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm overflow-x-auto">
          <h2 className="text-xl font-bold mb-6">أداء الباقات</h2>
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-3 pr-2 font-normal">الباقة</th>
                <th className="pb-3 font-normal">اختيارات</th>
                <th className="pb-3 font-normal">طلبات</th>
                <th className="pb-3 font-normal">مدفوعة</th>
              </tr>
            </thead>
            <tbody>
              {packageData.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">لا توجد بيانات</td></tr>}
              {packageData.map(p => (
                <tr key={p.code} className="border-b last:border-0">
                  <td className="py-3 pr-2 font-bold text-[#A88952]">{p.code}</td>
                  <td className="py-3">{p.selects}</td>
                  <td className="py-3">{p.orders}</td>
                  <td className="py-3">{p.paid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string, value: number, subtitle?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
      <h3 className="text-muted-foreground text-sm font-bold mb-2">{title}</h3>
      <div className="text-3xl font-bold text-[#1C1C1C]">{value}</div>
      {subtitle && <div className="text-sm text-muted-foreground mt-2">{subtitle}</div>}
    </div>
  )
}

function FunnelStep({ label, value, max, color = 'bg-primary' }: { label: string, value: number, max: number, color?: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-bold">{label}</span>
        <span className="text-muted-foreground">{value} ({(max > 0 && value <= max) ? percentage.toFixed(1) : '100'}%)</span>
      </div>
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  )
}
