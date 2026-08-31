import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export default async function AdminInvitationsSearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const auth = await requireAdminAccess()
  if (!auth) return redirect('/dashboard')

  const resolvedParams = await searchParams
  const q = resolvedParams.q || ''
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results: any[] = []
  
  if (q.trim()) {
    // Basic search across id, slug
    // We will use service role to bypass RLS for admin search
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Check if it looks like a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.trim());
    
    let query = adminClient
      .from('invitations')
      .select(`
        id, created_at, slug, status, user_id,
        template:templates(slug, title)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (isUuid) {
      query = query.eq('id', q.trim())
    } else {
      query = query.eq('slug', q.trim())
    }

    const { data } = await query
    if (data) results = data
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">البحث عن الدعوات (Invitations)</h1>
      
      <form className="mb-8 flex gap-4 max-w-2xl">
        <input 
          type="text" 
          name="q" 
          defaultValue={q}
          placeholder="ابحث بواسطة المعرف (ID) أو الرابط (Slug)..." 
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:border-amber-500 text-left"
          dir="ltr"
        />
        <button type="submit" className="bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800">
          بحث
        </button>
      </form>

      {q && results.length === 0 && (
        <div className="bg-white p-8 text-center rounded-lg shadow text-slate-500">
          لا توجد نتائج مطابقة للبحث.
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-4">
          {results.map((inv) => (
            <div key={inv.id} className="bg-white p-6 rounded-lg shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="text-xs text-slate-400 font-mono mb-1" dir="ltr">{inv.id}</div>
                <h3 className="font-bold text-lg mb-1">{inv.template?.title || 'Unknown Template'}</h3>
                <div className="text-sm text-slate-600 flex gap-4">
                  <span>الحالة: <span className="font-semibold text-slate-900">{inv.status}</span></span>
                  <span>الملكية: <span className="font-semibold text-slate-900">{inv.user_id ? 'Legacy Auth' : 'Anonymous Editor'}</span></span>
                  {inv.slug && <span>الرابط: <a href={`/${inv.slug}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{inv.slug}</a></span>}
                </div>
              </div>
              <Link 
                href={`/admin/operations/invitations/${inv.id}`}
                className="bg-amber-100 text-amber-800 px-4 py-2 rounded font-medium hover:bg-amber-200"
              >
                التفاصيل (Details)
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
