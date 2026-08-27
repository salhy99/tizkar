import AdminInvitationsClient, { AdminInvitation } from './AdminInvitationsClient'

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
    .limit(100);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-8 text-[#1C1C1C]">إدارة الدعوات</h1>
      <AdminInvitationsClient invitations={invitations as unknown as AdminInvitation[]} />
    </div>
  )
}
