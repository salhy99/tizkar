import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as any;

  if (!profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    redirect('/dashboard') // 403 fallback
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row" dir="rtl">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-l border-border flex-shrink-0">
        <div className="p-6 border-b border-border">
          <Link href="/admin" className="text-xl font-bold text-[#A88952] block text-center">
            تِذكار | الإدارة
          </Link>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/admin" className="block px-4 py-3 rounded-xl hover:bg-gray-50 text-[#1C1C1C] transition-colors">
            اللوحة الرئيسية
          </Link>
          <Link href="/admin/orders" className="block px-4 py-3 rounded-xl hover:bg-gray-50 text-[#1C1C1C] transition-colors">
            الطلبات والمدفوعات
          </Link>
          <Link href="/admin/invitations" className="block px-4 py-3 rounded-xl hover:bg-gray-50 text-[#1C1C1C] transition-colors">
            الدعوات
          </Link>
          <Link href="/admin/users" className="block px-4 py-3 rounded-xl hover:bg-gray-50 text-[#1C1C1C] transition-colors">
            المستخدمين
          </Link>
          <Link href="/dashboard" className="block px-4 py-3 rounded-xl hover:bg-gray-50 text-muted-foreground transition-colors mt-8">
            العودة للمنصة
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

    </div>
  )
}
