'use client';

import { createInvitation } from "@/actions/invitations";
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from 'next/link';

import { Suspense } from 'react';

function CreateInvitationComponent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ invitationId?: string, editToken?: string, recoveryKey?: string }>({});

  const hasCreated = useRef(false);

  useEffect(() => {
    if (!templateId) {
      router.push("/templates");
      return;
    }

    if (hasCreated.current) return;
    hasCreated.current = true;

    createInvitation(templateId).then((res) => {
      if (res.error) {
        setError(res.error);
        setStatus('error');
      } else {
        setResult(res);
        if (res.editToken) {
          setStatus('success');
        } else {
          // Legacy auth creation, redirect immediately
          router.push(`/editor/${res.invitationId}`);
        }
      }
    }).catch(() => {
      alert('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.')
      setStatus('error');
    });
  }, [templateId, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="text-destructive mb-4 text-4xl">⚠️</div>
          <h1 className="text-xl font-bold mb-4">حدث خطأ</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/templates" className="text-primary hover:underline">العودة للقوالب</Link>
        </div>
      </div>
    );
  }

  // Success UI for anonymous users
  const editLink = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/edit/${result.invitationId}?token=${result.editToken}`;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F3] p-4 text-right" dir="rtl">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full space-y-6 border border-border/50">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h1 className="text-3xl font-bold text-center text-[#1C1C1C]">احفظ بيانات استرداد دعوتك</h1>
        
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm leading-relaxed">
          <p className="font-bold mb-2">⚠️ بيانات سرية هامة</p>
          <p>أنت لم تقم بتسجيل الدخول. يجب حفظ رابط التعديل ورمز الاسترداد في مكان آمن، حيث أنهما الطريقة الوحيدة للوصول إلى دعوتك.</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">رابط التعديل:</label>
            <div className="flex gap-2">
              <div className="bg-muted p-3 rounded-xl flex-1 break-all font-mono text-left text-xs select-all overflow-x-auto whitespace-nowrap">
                {editLink}
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(editLink)}
                className="bg-primary/10 text-primary px-4 rounded-xl text-sm font-bold hover:bg-primary/20"
              >
                نسخ
              </button>
            </div>
          </div>
          
          {result.recoveryKey && (
            <div>
              <label className="block text-sm font-bold mb-2">رمز الاسترداد:</label>
              <div className="flex gap-2">
                <div className="bg-muted p-3 rounded-xl flex-1 font-mono text-center text-sm select-all tracking-wider font-bold text-primary">
                  {result.recoveryKey}
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(result.recoveryKey!)}
                  className="bg-primary/10 text-primary px-4 rounded-xl text-sm font-bold hover:bg-primary/20"
                >
                  نسخ
                </button>
              </div>
            </div>
          )}
        </div>

        <a href={`/editor/${result.invitationId}`} className="block w-full text-center bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors mt-6">
          دخول المحرر
        </a>
      </div>
    </div>
  );
}

export default function CreateInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FAF8F3]"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <CreateInvitationComponent />
    </Suspense>
  );
}
