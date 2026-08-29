'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { useRouter } from 'next/navigation';
import { 
  generateShareText, 
  buildWhatsAppShareUrl, 
  buildTelegramShareUrl, 
  sanitizeFilenameSlug 
} from '@/lib/utils/share';
import { FeatureGate } from '@/components/ui/FeatureGate';

type ShareClientProps = {
  invitationId: string;
  title: string;
  groomName: string;
  brideName: string;
  slug: string;
  status: string;
  paymentStatus: string | null;
  publicUrl: string;
  expiresAt: string | null;
  entitlements: import('@/lib/entitlements').PackageEntitlements;
};

export default function ShareClient({
  invitationId,
  title,
  groomName,
  brideName,
  slug,
  status,
  paymentStatus,
  publicUrl,
  expiresAt,
  entitlements
}: ShareClientProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShareSupported(true);
    }
  }, []);

  const isPublished = status === 'PUBLISHED';
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const isActive = isPublished && !isExpired;

  let displayStatus = 'مسودة';
  if (isExpired) displayStatus = 'منتهية الصلاحية';
  else if (isPublished) displayStatus = 'منشورة ✓';
  else if (paymentStatus === 'PAID') displayStatus = 'الدفع مؤكد - بانتظار النشر';

  const shareText = generateShareText(title, groomName, brideName);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = publicUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!shareSupported) return;
    try {
      await navigator.share({
        title: title,
        text: shareText,
        url: publicUrl,
      });
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const handleWhatsApp = () => {
    window.open(buildWhatsAppShareUrl(shareText, publicUrl), '_blank');
  };

  const handleTelegram = () => {
    window.open(buildTelegramShareUrl(shareText, publicUrl), '_blank');
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const safeSlug = sanitizeFilenameSlug(slug);
    link.download = `tizkar-${safeSlug}-qr.svg`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-border h-16 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="font-bold text-lg">مشاركة الدعوة</div>
        <Button variant="outline" onClick={() => router.push(`/editor/${invitationId}`)}>
          العودة للمحرر
        </Button>
      </header>

      <main className="flex-1 p-4 lg:p-8 flex flex-col items-center justify-start space-y-6">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-border p-6 space-y-8 mt-4 lg:mt-8">
          
          {/* Status Banner */}
          <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-muted/30 rounded-xl border border-dashed border-border text-center">
            <h2 className="text-xl font-bold">{title}</h2>
            
            <div className={`px-4 py-2 rounded-lg font-bold text-sm ${isActive ? 'bg-green-100 text-green-700' : isExpired ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
              الحالة: {displayStatus}
            </div>

            {!isActive && (
              <div className="text-sm text-muted-foreground max-w-sm mt-2">
                {isExpired ? 'انتهت صلاحية هذه الدعوة ولا يمكن مشاركة الرابط.' : 
                  status === 'DRAFT' && paymentStatus === 'PAID' ? 'الدفع مؤكد. يرجى مراجعة الدعوة في المحرر ثم النقر على "نشر الدعوة" لتفعيل الرابط.' :
                  'لم يتم نشر الدعوة بعد. الروابط قابلة للنسخ ولكنها لن تعمل حتى تقوم بالنشر.'}
              </div>
            )}
            
            {!isActive && (
              <Button onClick={() => router.push(`/editor/${invitationId}`)} variant="default" className="mt-2">
                مراجعة ونشر الدعوة
              </Button>
            )}
          </div>

          {/* Share Actions */}
          <div className="space-y-4">
            <h3 className="font-bold border-b border-border pb-2">طرق المشاركة</h3>
            
            {/* Direct Link */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted px-4 py-3 rounded-lg overflow-hidden flex items-center border border-border">
                <span className="truncate text-sm text-left dir-ltr w-full font-mono text-muted-foreground">{publicUrl}</span>
              </div>
              <Button onClick={handleCopy} disabled={!isActive && !publicUrl} className="shrink-0 w-24">
                {copied ? 'تم النسخ ✓' : 'نسخ الرابط'}
              </Button>
            </div>

            {/* Platform Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                onClick={handleWhatsApp} 
                disabled={!isActive}
                className="bg-[#25D366] hover:bg-[#1DA851] text-white flex items-center justify-center gap-2"
              >
                واتساب
              </Button>
              <Button 
                onClick={handleTelegram} 
                disabled={!isActive}
                className="bg-[#0088cc] hover:bg-[#0077b5] text-white flex items-center justify-center gap-2"
              >
                تيليغرام
              </Button>
              {shareSupported && (
                <Button 
                  onClick={handleNativeShare} 
                  disabled={!isActive}
                  variant="outline"
                  className="col-span-2"
                >
                  المزيد من خيارات المشاركة...
                </Button>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-bold text-center">رمز QR للدعوة</h3>
            <p className="text-xs text-muted-foreground text-center -mt-2">امسح الرمز لفتح الدعوة</p>
            
            <div className={`flex flex-col items-center justify-center gap-4 ${!isActive ? 'opacity-50 grayscale' : ''}`}>
              <div className="p-4 bg-white rounded-xl shadow-sm border border-border">
                <QRCodeSVG 
                  value={publicUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                  ref={qrRef}
                />
              </div>
              
              <div className="flex gap-4">
                <Button variant="outline" onClick={downloadQR} disabled={!isActive}>
                  تحميل QR (SVG)
                </Button>
                <a href={isActive ? publicUrl : '#'} target="_blank" rel="noopener noreferrer" className={!isActive ? "pointer-events-none" : ""}>
                  <Button variant="default" disabled={!isActive}>
                    فتح الدعوة
                  </Button>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Story Visual */}
        {isActive && (
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4 lg:mt-8 flex flex-col items-center">
            <h3 className="font-bold border-b border-border w-full pb-2 text-center">صورة ستوري (إنستغرام / سناب شات)</h3>
            <p className="text-xs text-muted-foreground text-center">قم بتحميل الصورة لمشاركتها كقصة في حساباتك</p>
            
            <FeatureGate 
              isLocked={!entitlements.storyExport}
              featureName="تصدير ستوري"
              requiredPackage="Plus"
              invitationId={invitationId}
            >
              <Button 
                variant="default"
                className="bg-primary text-white"
                onClick={() => {
                  const safeSlug = sanitizeFilenameSlug(slug);
                  const a = document.createElement('a');
                  a.href = `/api/invitations/${invitationId}/story`;
                  a.download = `tizkar-${safeSlug}-story.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                تحميل صورة الستوري (1080x1920)
              </Button>
            </FeatureGate>
          </div>
        )}
      </main>
    </div>
  );
}
