import { getPublicInvitation } from '@/actions/publicInvitation'
import { LayaliRenderer } from '@/components/templates/layali'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PublicLayout from './components/PublicLayout'

export const revalidate = 1800; // 30 minutes. Ensures Signed URLs (60 mins expiry) never expire while cached.

// SEO and Open Graph
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await params
  const res = await getPublicInvitation(p.slug)
  
  if (res.error || !res.data) {
    return {
      title: 'دعوة غير متاحة | تِذكار',
      robots: 'noindex, nofollow'
    }
  }

  const { groomName, brideName } = res.data.data
  const title = `دعوة زفاف ${groomName || 'العريس'} و${brideName || 'العروس'} | تِذكار`

  return {
    title,
    description: res.data.data.quote || 'دعوتكم لمشاركتنا فرحتنا ❤️',
    robots: 'noindex, nofollow', // Ensure it doesn't get indexed by search engines
    openGraph: {
      title,
      description: res.data.data.quote || 'دعوتكم لمشاركتنا فرحتنا ❤️',
      siteName: 'تِذكار'
    }
  }
}

export default async function PublicInvitationPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await params
  const res = await getPublicInvitation(p.slug)

  if (res.error) {
    if (res.error === 'EXPIRED') {
      return (
        <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center text-center p-4">
          <div className="bg-white p-12 rounded-3xl shadow-xl max-w-md w-full border border-[#A88952]/20">
            <div className="text-4xl mb-4">⌛</div>
            <h1 className="text-2xl font-bold text-[#A88952] mb-2">انتهت صلاحية هذه الدعوة</h1>
            <p className="text-muted-foreground">شكراً لاهتمامك، موعد المناسبة قد انقضى.</p>
          </div>
        </div>
      )
    }
    // For NOT_FOUND, NOT_PUBLISHED_VERSION, etc.
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center text-center p-4">
        <div className="bg-white p-12 rounded-3xl shadow-xl max-w-md w-full border border-border">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">هذه الدعوة غير متاحة حالياً</h1>
          <p className="text-muted-foreground">قد يكون الرابط غير صحيح أو تم إيقاف الدعوة مؤقتاً.</p>
        </div>
      </div>
    )
  }

  if (!res.data) return notFound();

  return (
    <PublicLayout data={res.data.data} invitationId={res.data.id}>
      <LayaliRenderer data={res.data.data} isPublicView={true} />
    </PublicLayout>
  )
}
