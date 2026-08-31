import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export default async function AdminSupportPage() {
  const admin = await requireAdminAccess()
  if (!admin) return redirect('/dashboard')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: cases, error } = await supabase
    .from('support_cases')
    .select('*')
    .order('last_activity_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching support cases:', error)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">الدعم الفني (Support Cases)</h1>
        <Link href="/admin/operations/support/new" className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold">
          إنشاء تذكرة جديدة
        </Link>
      </div>

      {!cases || cases.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center text-slate-500">
          لا توجد تذاكر دعم فني مفتوحة حالياً.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead className="bg-slate-100 border-b">
              <tr>
                <th className="p-4 font-semibold text-slate-600">رقم التذكرة</th>
                <th className="p-4 font-semibold text-slate-600">الموضوع</th>
                <th className="p-4 font-semibold text-slate-600">التصنيف</th>
                <th className="p-4 font-semibold text-slate-600">الأولوية</th>
                <th className="p-4 font-semibold text-slate-600">الحالة</th>
                <th className="p-4 font-semibold text-slate-600">آخر نشاط</th>
                <th className="p-4 font-semibold text-slate-600">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-mono text-slate-500" dir="ltr">{c.id.split('-')[0]}</td>
                  <td className="p-4 font-medium">{c.subject}</td>
                  <td className="p-4 text-sm">{c.category}</td>
                  <td className="p-4 text-sm">{c.priority}</td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${c.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                        c.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                        c.status === 'WAITING_CUSTOMER' ? 'bg-purple-100 text-purple-800' :
                        c.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                        'bg-slate-100 text-slate-800'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-500">{new Date(c.last_activity_at).toLocaleDateString('ar-SA')}</td>
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
      )}
    </div>
  )
}
