import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'

export default async function AdminSupportPage() {
  const auth = await requireAdminAccess()
  if (!auth) return redirect('/dashboard')

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">الدعم الفني (Support Cases)</h1>
      <div className="bg-white p-8 rounded-lg shadow text-center text-slate-500">
        سيتم إطلاق نظام تتبع ملاحظات الدعم الفني في التحديث القادم. 
        يرجى استخدام البحث عن الدعوات أو الطلبات للمساعدة الحالية.
      </div>
    </div>
  )
}
