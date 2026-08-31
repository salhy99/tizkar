import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OperationsOverviewPage() {
  const auth = await requireAdminAccess()
  if (!auth) return redirect('/dashboard')

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">نظرة عامة (Overview)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/operations/payments" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
          <h2 className="text-xl font-bold mb-2 text-amber-600">المدفوعات المعلقة (Pending Payments)</h2>
          <p className="text-slate-600 text-sm">مراجعة وتأكيد المدفوعات الجديدة.</p>
        </Link>

        <Link href="/admin/operations/invitations" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
          <h2 className="text-xl font-bold mb-2 text-emerald-600">الدعوات (Invitations)</h2>
          <p className="text-slate-600 text-sm">البحث عن دعوة محددة أو عرض حالتها.</p>
        </Link>
        
        <Link href="/admin/operations/support" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
          <h2 className="text-xl font-bold mb-2 text-blue-600">الدعم الفني (Support)</h2>
          <p className="text-slate-600 text-sm">مراجعة ملاحظات الدعم الداخلية.</p>
        </Link>
      </div>
    </div>
  )
}
