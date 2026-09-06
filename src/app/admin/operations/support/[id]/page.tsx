import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import SupportCaseControls from './components/SupportCaseControls'

export default async function SupportCaseDetailPage({ params }: { params: { id: string } }) {
  const admin = await requireAdminAccess()
  if (!admin) return redirect('/dashboard')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: supportCase, error } = await supabase
    .from('support_cases')
    .select(`
      *,
      support_case_notes (
        *
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !supportCase) {
    return (
      <div className="p-8 text-center text-slate-500">
        التذكرة غير موجودة (Case Not Found)
      </div>
    )
  }

  // Sort notes
  const notes = supportCase.support_case_notes?.sort((a: any, b: any) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ) || []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/admin/operations/support" className="text-slate-500 hover:text-slate-800 text-sm mb-2 block">
            &rarr; العودة للقائمة
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {supportCase.subject}
            <span className={`text-xs px-2 py-1 rounded-full text-white ${
              supportCase.priority === 'URGENT' ? 'bg-red-600' :
              supportCase.priority === 'HIGH' ? 'bg-orange-500' :
              supportCase.priority === 'NORMAL' ? 'bg-blue-500' : 'bg-slate-400'
            }`}>
              {supportCase.priority}
            </span>
          </h1>
          <div className="text-sm text-slate-500 font-mono mt-1" dir="ltr">{supportCase.id}</div>
        </div>
        
        <div className="text-left space-y-2">
          <div className="text-sm font-semibold text-slate-600">الحالة الحالية</div>
          <div className="font-bold text-lg">{supportCase.status}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">التفاصيل</h2>
          <div className="text-sm grid grid-cols-2 gap-2">
            <span className="text-slate-500">التصنيف:</span>
            <span className="font-medium">{supportCase.category}</span>
            <span className="text-slate-500">أنشئت بواسطة:</span>
            <span className="font-medium">{supportCase.created_by_admin_identifier}</span>
            <span className="text-slate-500">تاريخ الإنشاء:</span>
            <span className="font-medium">{new Date(supportCase.created_at).toLocaleString('ar-SA')}</span>
            <span className="text-slate-500">آخر نشاط:</span>
            <span className="font-medium">{new Date(supportCase.last_activity_at).toLocaleString('ar-SA')}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">الارتباطات</h2>
          <div className="text-sm flex flex-col gap-3">
            {supportCase.invitation_id ? (
              <div>
                <span className="text-slate-500 block mb-1">الدعوة المرتبطة:</span>
                <Link href={`/admin/operations/invitations/${supportCase.invitation_id}`} className="text-amber-600 hover:underline font-mono text-xs">
                  {supportCase.invitation_id}
                </Link>
              </div>
            ) : <div className="text-slate-400">لا توجد دعوة مرتبطة</div>}

            {supportCase.order_id && (
              <div>
                <span className="text-slate-500 block mb-1">الطلب المرتبط:</span>
                <span className="font-mono text-xs text-slate-700">{supportCase.order_id}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="bg-slate-50 p-4 border-b font-bold text-slate-800 flex justify-between items-center">
          سجل الملاحظات (Notes Timeline)
        </div>
        <div className="p-6 space-y-6">
          {notes.length === 0 ? (
            <div className="text-center text-slate-400 py-4">لا توجد ملاحظات.</div>
          ) : (
            notes.map((note: any) => (
              <div key={note.id} className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50">
                <div className="bg-slate-100 p-2 text-xs flex justify-between text-slate-500">
                  <span>{note.author_admin_identifier}</span>
                  <span>{new Date(note.created_at).toLocaleString('ar-SA')}</span>
                </div>
                <div className="p-4 text-sm text-slate-800 whitespace-pre-wrap">
                  {note.body}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden p-6">
        <h2 className="font-bold text-slate-800 mb-4">إضافة ملاحظة أو تغيير الحالة</h2>
        <div className="text-xs text-red-500 mb-4 font-semibold">تنبيه الخصوصية: لا تضع مفاتيح الاستعادة أو رموز التعديل أو كلمات المرور داخل الملاحظات.</div>
        
        <SupportCaseControls 
          caseId={supportCase.id} 
          currentStatus={supportCase.status} 
          currentPriority={supportCase.priority} 
        />
      </div>
    </div>
  )
}
