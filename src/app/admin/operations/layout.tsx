import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OperationsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
    return redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row rtl" dir="rtl">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-4">مركز العمليات (Operations)</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/admin/operations" className="hover:text-amber-400 py-2 border-b border-slate-700">نظرة عامة (Overview)</Link>
          <Link href="/admin/operations/invitations" className="hover:text-amber-400 py-2 border-b border-slate-700">الدعوات (Invitations)</Link>
          <Link href="/admin/operations/payments" className="hover:text-amber-400 py-2 border-b border-slate-700">الدفع (Payments)</Link>
          <Link href="/admin/operations/support" className="hover:text-amber-400 py-2 border-b border-slate-700">الدعم (Support)</Link>
          <Link href="/admin/operations/health" className="hover:text-amber-400 py-2 border-b border-slate-700">الصحة التشغيلية (Health)</Link>
          <Link href="/admin/operations/audit" className="hover:text-amber-400 py-2 border-b border-slate-700">سجل التدقيق (Audit)</Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-gray-50 p-6 md:p-12 overflow-y-auto text-slate-800">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
