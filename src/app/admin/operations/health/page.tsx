import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'

export default async function AdminHealthPage() {
  const auth = await requireAdminAccess()
  if (!auth) return redirect('/dashboard')

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">الصحة التشغيلية (Operational Health)</h1>
      <div className="bg-white p-8 rounded-lg shadow text-center text-slate-500">
        سيتم إطلاق أدوات فحص صحة النظام وتتبع الأحداث قريباً.
      </div>
    </div>
  )
}
