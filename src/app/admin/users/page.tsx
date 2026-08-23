import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AdminUsersPage() {
  const { createClient: createAdmin } = await import('@supabase/supabase-js')
  const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Fetch users, count invitations per user
  // Since we can't easily do complex join aggregates in simple Supabase JS without RPC, 
  // we will fetch profiles and then a separate count if needed, or just fetch profiles and limit to 50 for Phase 5.
  const { data: users } = await adminClient
    .from('profiles')
    .select(`
      id,
      display_name,
      phone,
      role,
      created_at,
      invitations ( id, status )
    `)
    .order('created_at', { ascending: false })
    .limit(100) as any;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1C1C1C]">إدارة المستخدمين</h1>
        <p className="text-muted-foreground mt-2">عرض بيانات مسجلي المنصة</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-[#FAF8F3] border-b border-border text-sm text-muted-foreground">
              <tr>
                <th className="p-4 font-normal">الاسم</th>
                <th className="p-4 font-normal">رقم الهاتف</th>
                <th className="p-4 font-normal">الصلاحية</th>
                <th className="p-4 font-normal text-center">عدد الدعوات</th>
                <th className="p-4 font-normal">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users && users.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-[#1C1C1C]">{u.display_name || 'بدون اسم'}</td>
                  <td className="p-4 font-mono text-sm" dir="ltr">{u.phone || 'غير متوفر'}</td>
                  <td className="p-4">
                    {u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? (
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">{u.role}</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">{u.role}</span>
                    )}
                  </td>
                  <td className="p-4 text-center font-bold">{u.invitations?.length || 0}</td>
                  <td className="p-4 text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">لا يوجد مستخدمين</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
