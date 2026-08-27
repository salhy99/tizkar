'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  created_at: string
  is_read: boolean
}

export function DashboardHeader({ userName, phone, userId }: { userName: string, phone: string, userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  
  useEffect(() => {
    const fetchNotifications = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setNotifications(data as Notification[])
    }
    fetchNotifications()
  }, [userId, showDropdown])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markAllAsRead = async () => {
    if (unreadCount === 0) return
    const supabase = createClient()
    // @ts-expect-error - Supabase strict typing expects never for update when generated types are absent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('notifications').update({ is_read: true } as any).eq('user_id', userId).eq('is_read', false)
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })))
  }

  return (
    <header className="bg-white border-b border-border sticky top-0 z-20">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between max-w-6xl">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold text-[#A88952]">تِذكار</Link>
          <div className="hidden md:block w-px h-8 bg-border"></div>
          <h1 className="text-xl font-semibold hidden md:block">لوحة التحكم</h1>
        </div>
        
        <div className="flex items-center gap-4 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-muted-foreground hover:text-[#1C1C1C]"
            onClick={() => {
              setShowDropdown(!showDropdown);
              if (!showDropdown) markAllAsRead();
            }}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}
          </Button>
          
          {showDropdown && (
            <div className="absolute top-14 right-0 w-80 bg-white border border-border shadow-xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-border font-bold">الإشعارات</div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">لا توجد إشعارات</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-4 border-b border-gray-50 flex gap-3 ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                      <div className="mt-1">
                        {n.type === 'ORDER_APPROVED' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {n.type === 'ORDER_REJECTED' && <XCircle className="w-5 h-5 text-red-500" />}
                        {n.type === 'INVITATION_SUSPENDED' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {n.type === 'PAYMENT_RECEIVED' && <Info className="w-5 h-5 text-blue-500" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm mb-1">{n.title}</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">{n.message}</div>
                        <div className="text-[10px] text-gray-400 mt-2" dir="ltr">{new Date(n.created_at).toLocaleString('en-GB')}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-sm font-bold">{userName}</span>
            <span className="text-xs text-muted-foreground" dir="ltr">{phone}</span>
          </div>

          <form action="/auth/signout" method="POST">
            <Button variant="ghost" type="submit" className="text-destructive hover:text-destructive hover:bg-destructive/10 text-sm">
              تسجيل الخروج
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
