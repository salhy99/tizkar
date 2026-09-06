import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'
import NewSupportCaseForm from './components/NewSupportCaseForm'

export default async function NewSupportCasePage({ searchParams }: { searchParams: { invitation_id?: string, order_id?: string } }) {
  const admin = await requireAdminAccess()
  if (!admin) return redirect('/dashboard')

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">إنشاء تذكرة دعم فني جديدة</h1>
      <NewSupportCaseForm 
        defaultInvitationId={searchParams.invitation_id || ''} 
        defaultOrderId={searchParams.order_id || ''} 
      />
    </div>
  )
}
