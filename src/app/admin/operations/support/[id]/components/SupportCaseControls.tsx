'use client'

import { useState } from 'react'
import { addSupportNote, updateSupportCaseStatus, updateSupportCasePriority } from '@/actions/support'

export default function SupportCaseControls({ caseId, currentStatus, currentPriority }: { caseId: string, currentStatus: string, currentPriority: string }) {
  const [noteBody, setNoteBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const [priority, setPriority] = useState(currentPriority)

  const handleAddNote = async () => {
    if (!noteBody.trim()) return
    setLoading(true)
    const res = await addSupportNote(caseId, noteBody)
    if (res.success) {
      setNoteBody('')
    } else {
      alert('Error adding note: ' + res.error)
    }
    setLoading(false)
  }

  const handleUpdateStatus = async (e: any) => {
    const val = e.target.value
    setLoading(true)
    const res = await updateSupportCaseStatus(caseId, val as any)
    if (res.success) {
      setStatus(val)
    } else {
      alert('Error updating status: ' + res.error)
    }
    setLoading(false)
  }

  const handleUpdatePriority = async (e: any) => {
    const val = e.target.value
    setLoading(true)
    const res = await updateSupportCasePriority(caseId, val as any)
    if (res.success) {
      setPriority(val)
    } else {
      alert('Error updating priority: ' + res.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 p-4 bg-slate-50 rounded border">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          تغيير الحالة:
          <select value={status} onChange={handleUpdateStatus} disabled={loading} className="border p-2 rounded text-slate-800">
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="WAITING_CUSTOMER">WAITING_CUSTOMER</option>
            <option value="WAITING_INTERNAL">WAITING_INTERNAL</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          تغيير الأولوية:
          <select value={priority} onChange={handleUpdatePriority} disabled={loading} className="border p-2 rounded text-slate-800">
            <option value="LOW">LOW</option>
            <option value="NORMAL">NORMAL</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <textarea 
          className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
          rows={4}
          placeholder="اكتب الملاحظة الداخلية هنا..."
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          disabled={loading}
        />
        <div className="flex justify-end">
          <button 
            onClick={handleAddNote}
            disabled={loading || !noteBody.trim()}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
          >
            {loading ? 'جاري الإضافة...' : 'إضافة الملاحظة'}
          </button>
        </div>
      </div>
    </div>
  )
}
