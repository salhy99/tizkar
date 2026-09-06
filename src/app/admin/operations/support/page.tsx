import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export default async function AdminSupportPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const admin = await requireAdminAccess()
  if (!admin) return redirect('/dashboard')

  const resolvedSearchParams = await searchParams
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search.trim() : ''
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : ''
  const priority = typeof resolvedSearchParams.priority === 'string' ? resolvedSearchParams.priority : ''
  const category = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : ''

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabase
    .from('support_cases')
    .select('*, invitation:invitations(id, title), order:orders(id)', { count: 'exact' })

  if (search) {
    // If it looks like a UUID, search ID fields, otherwise search subject
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(search)) {
      query = query.or(`id.eq.${search},invitation_id.eq.${search},order_id.eq.${search}`)
    } else {
      query = query.ilike('subject', `%${search}%`)
    }
  }

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (category) query = query.eq('category', category)

  const pageSize = 25
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: cases, count, error } = await query
    .order('last_activity_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching support cases:', error)
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 1

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">الدعم الفني (Support Cases)</h1>
        <Link href="/admin/operations/support/new" className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold">
          إنشاء تذكرة جديدة
        </Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <form className="flex flex-wrap gap-4 items-end" method="GET" action="/admin/operations/support">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            البحث
            <input name="search" defaultValue={search} placeholder="موضوع التذكرة أو UUID..." className="border p-2 rounded text-slate-800 text-sm font-mono w-64" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            الحالة
            <select name="status" defaultValue={status} className="border p-2 rounded text-slate-800 text-sm">
              <option value="">الكل</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="WAITING_CUSTOMER">WAITING_CUSTOMER</option>
              <option value="WAITING_INTERNAL">WAITING_INTERNAL</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            الأولوية
            <select name="priority" defaultValue={priority} className="border p-2 rounded text-slate-800 text-sm">
              <option value="">الكل</option>
              <option value="LOW">LOW</option>
              <option value="NORMAL">NORMAL</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            التصنيف
            <select name="category" defaultValue={category} className="border p-2 rounded text-slate-800 text-sm">
              <option value="">الكل</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="RECOVERY">RECOVERY</option>
              <option value="EDITOR">EDITOR</option>
              <option value="MEDIA">MEDIA</option>
              <option value="PUBLISH">PUBLISH</option>
              <option value="RSVP">RSVP</option>
              <option value="ACCOUNT">ACCOUNT</option>
              <option value="TECHNICAL">TECHNICAL</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>
          <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded">
            تصفية
          </button>
          {(search || status || priority || category) && (
            <Link href="/admin/operations/support" className="text-slate-500 hover:text-slate-800 underline text-sm ml-4">
              إلغاء
            </Link>
          )}
        </form>
      </div>

      {!cases || cases.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center text-slate-500">
          لا توجد تذاكر متطابقة.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-max">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="p-4 font-semibold text-slate-600">رقم التذكرة</th>
                  <th className="p-4 font-semibold text-slate-600">الموضوع</th>
                  <th className="p-4 font-semibold text-slate-600">التصنيف</th>
                  <th className="p-4 font-semibold text-slate-600">الأولوية</th>
                  <th className="p-4 font-semibold text-slate-600">الحالة</th>
                  <th className="p-4 font-semibold text-slate-600">ارتباط</th>
                  <th className="p-4 font-semibold text-slate-600">آخر نشاط</th>
                  <th className="p-4 font-semibold text-slate-600">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-xs font-mono text-slate-500" dir="ltr">{c.id.split('-')[0]}</td>
                    <td className="p-4 font-medium text-sm max-w-[200px] truncate" title={c.subject}>{c.subject}</td>
                    <td className="p-4 text-xs">{c.category}</td>
                    <td className="p-4 text-xs">
                      <span className={`px-2 py-1 rounded-full text-white ${
                        c.priority === 'URGENT' ? 'bg-red-600' :
                        c.priority === 'HIGH' ? 'bg-orange-500' :
                        c.priority === 'NORMAL' ? 'bg-blue-500' : 'bg-slate-400'
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      <span className={`px-2 py-1 rounded-full font-semibold
                        ${c.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                          c.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                          c.status === 'WAITING_CUSTOMER' ? 'bg-purple-100 text-purple-800' :
                          c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-800'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {c.invitation_id && <span className="block truncate max-w-[100px]" title={c.invitation_id}>Inv: {c.invitation_id.split('-')[0]}</span>}
                      {c.order_id && <span className="block truncate max-w-[100px]" title={c.order_id}>Ord: {c.order_id.split('-')[0]}</span>}
                    </td>
                    <td className="p-4 text-xs text-slate-500">{new Date(c.last_activity_at).toLocaleDateString('ar-SA')}</td>
                    <td className="p-4">
                      <Link href={`/admin/operations/support/${c.id}`} className="text-amber-600 hover:text-amber-700 font-medium text-sm underline">
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="bg-slate-50 p-4 border-t flex justify-center gap-2">
              {page > 1 && (
                <Link 
                  href={`/admin/operations/support?page=${page - 1}&search=${search}&status=${status}&priority=${priority}&category=${category}`}
                  className="px-3 py-1 bg-white border rounded text-sm hover:bg-slate-100"
                >
                  السابق
                </Link>
              )}
              <span className="px-3 py-1 text-sm text-slate-600">صفحة {page} من {totalPages}</span>
              {page < totalPages && (
                <Link 
                  href={`/admin/operations/support?page=${page + 1}&search=${search}&status=${status}&priority=${priority}&category=${category}`}
                  className="px-3 py-1 bg-white border rounded text-sm hover:bg-slate-100"
                >
                  التالي
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
