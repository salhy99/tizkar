import React from 'react';
import { Lock } from 'lucide-react';
import Link from 'next/link';

type FeatureGateProps = {
  isLocked: boolean;
  featureName: string;
  requiredPackage?: string;
  invitationId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function FeatureGate({
  isLocked,
  featureName,
  requiredPackage,
  invitationId,
  children,
  fallback
}: FeatureGateProps) {
  if (!isLocked) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="relative group rounded-2xl overflow-hidden border border-border/50 bg-muted/20">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center transition-all">
        <div className="w-12 h-12 rounded-full bg-background shadow-sm border border-border flex items-center justify-center mb-3">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-foreground mb-1">{featureName}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
          هذه الميزة متاحة ضمن باقة {requiredPackage || 'أعلى'}.
        </p>
        
        {invitationId && (
          <Link 
            href={`/dashboard/plans/${invitationId}`}
            className="text-xs font-semibold px-4 py-2 bg-[#A88952] text-white rounded-lg hover:bg-[#A88952]/90 transition-colors shadow-sm"
          >
            ترقية الباقة
          </Link>
        )}
      </div>
      
      {/* Blurred out preview content */}
      <div className="opacity-40 pointer-events-none select-none blur-[2px] saturate-50 p-6" aria-hidden="true" inert={true}>
        {children}
      </div>
    </div>
  );
}
