'use server'

import { createClient } from '@/lib/supabase/server'
import { otpProvider } from '@/lib/auth/otp-provider'
import { cookies } from 'next/headers'

export async function sendLoginOtp(phone: string) {
  // In a real implementation with custom SMS provider:
  // 1. Generate OTP
  // 2. Save OTP to DB with expiration
  // 3. Send OTP using otpProvider.sendOtp(phone)
  // For Phase 1 with Supabase Auth, we will use Supabase's native OTP for test numbers
  // OR we simulate it using our DevOtpProvider.
  
  // Since we don't have a real Supabase instance configured with test numbers here,
  // we simulate sending OTP via our dev provider.
  const result = await otpProvider.sendOtp(phone)
  if (!result.success) {
    return { error: result.error || 'حدث خطأ غير متوقع' }
  }

  // In real life, we might also call supabase.auth.signInWithOtp({ phone })
  // if we were using a webhook-based custom SMS provider in Supabase.

  return { success: true }
}

export async function verifyLoginOtp(phone: string, code: string) {
  const result = await otpProvider.verifyOtp(phone, code)
  
  if (!result.success) {
    return { error: result.error || 'رمز التحقق غير صحيح' }
  }

  // OTP is valid. We need to create a session.
  // Because we are using a Dev provider without Supabase's native SMS configured,
  // we can use a workaround for Phase 1 to authenticate the user:
  // In a real Supabase Auth + Custom SMS, you would use a Custom JWT or Supabase Webhooks.
  // For the sake of Phase 1 working demo, we will use email/password in the background 
  // mapped to the phone number to establish a real Supabase session, 
  // ensuring RLS works perfectly.
  
  const supabase = await createClient()
  
  const dummyEmail = `${phone.replace('+', '')}@tidkar.local`
  const dummyPassword = `${process.env.SUPABASE_DUMMY_PASSWORD || 'tidkar-dev-pass-2026'}`

  // Try to sign in
  let { error, data } = await supabase.auth.signInWithPassword({
    email: dummyEmail,
    password: dummyPassword,
  })

  // If user doesn't exist, create it
  if (error && error.message.includes('Invalid login credentials')) {
    const signupRes = await supabase.auth.signUp({
      email: dummyEmail,
      password: dummyPassword,
      options: {
        data: {
          phone: phone,
        }
      }
    })
    
    if (signupRes.error) {
      return { error: 'حدث خطأ أثناء إنشاء الحساب' }
    }
    
    // Create profile
    if (signupRes.data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: signupRes.data.user.id,
        phone: phone,
        display_name: 'مستخدم تذكار',
        role: 'USER'
      } as any)
      if (profileError) {
        console.error('Error creating profile', profileError)
      }
    }
  } else if (error) {
    return { error: 'حدث خطأ في النظام' }
  }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
