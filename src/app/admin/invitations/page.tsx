import { createClient } from '@/lib/supabase/server'
import AdminInvitationsClient from './AdminInvitationsClient'

export default async function AdminInvitationsPage() {
  const { createClient: createAdmin } = await import('@supabase/supabase-js')
  const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Fetch all invitations with user data
  const { data: invitations } = await adminClient
    .from('invitations')
    .select(`
      id,
      title,
      slug,
      status,
      created_at,
      published_at,
      expires_at,
      profiles:user_id ( display_name, phone )
    `)
    .order('created_at', { ascending: false })
    .limit(100) as any;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1C1C1C]">إدارة الدعوات</h1>
        <p className="text-muted-foreground mt-2">عرض جميع دعوات المنصة وإيقاف الدعوات المخالفة</p>
      </div>

      <AdminInvitationsClient invitations={invitations || []} />
    </div>
  )
}
