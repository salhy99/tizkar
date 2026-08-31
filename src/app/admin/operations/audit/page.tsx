import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default async function AdminAuditPage() {
  const auth = await requireAdminAccess()
  if (!auth) return redirect('/dashboard')

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: logs } = await adminClient
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">سجل التدقيق (Audit Log)</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b">
            <tr>
              <th className="p-4 font-semibold">التاريخ (Date)</th>
              <th className="p-4 font-semibold">المسؤول (Admin)</th>
              <th className="p-4 font-semibold">الإجراء (Action)</th>
              <th className="p-4 font-semibold">الكائن (Entity)</th>
              <th className="p-4 font-semibold">التفاصيل (Metadata)</th>
            </tr>
          </thead>
          <tbody>
            {!logs || logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">لا توجد سجلات تدقيق حتى الآن.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-slate-50">
                  <td className="p-4" dir="ltr">{new Date(log.created_at).toLocaleString('en-US')}</td>
                  <td className="p-4 font-mono text-xs">{log.admin_user_id.substring(0,8)}...</td>
                  <td className="p-4 font-bold">{log.action}</td>
                  <td className="p-4">
                    <div className="font-mono text-xs text-slate-500">{log.entity_type}</div>
                    <div className="font-mono text-xs">{log.entity_id}</div>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-600 max-w-xs truncate" title={JSON.stringify(log.metadata)}>
                    {JSON.stringify(log.metadata)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
