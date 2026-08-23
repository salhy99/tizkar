import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export interface OtpProvider {
  sendOtp(phone: string): Promise<{ success: boolean; error?: string }>;
  verifyOtp(phone: string, code: string): Promise<{ success: boolean; error?: string }>;
}

function normalizeIraqiPhone(phone: string): string {
  // Remove all non-numeric characters (like + or spaces)
  let p = phone.replace(/\D/g, '')
  
  // If starts with 07, replace 0 with 964
  if (p.startsWith('07')) {
    p = '964' + p.substring(1)
  }
  
  // If starts with 7 (e.g. 770...), prepend 964
  if (p.startsWith('7')) {
    p = '964' + p
  }

  return p
}

export class OtpiqOtpProvider implements OtpProvider {
  private getAdminClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  private generateHash(otp: string): string {
    const secret = process.env.OTP_HASH_SECRET
    if (!secret) throw new Error('OTP_HASH_SECRET is missing')
    return crypto.createHmac('sha256', secret).update(otp).digest('hex')
  }

  async sendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedPhone = normalizeIraqiPhone(phone)
      
      // Basic validation for Iraqi number length (964 + 10 digits = 13 digits)
      if (!/^9647\d{9}$/.test(normalizedPhone)) {
        return { success: false, error: 'رقم هاتف غير صالح' }
      }

      const adminClient = this.getAdminClient()
      const now = new Date()

      // 1. Hourly Rate Limiting
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      const { count } = await adminClient
        .from('otp_requests')
        .select('id', { count: 'exact' })
        .eq('phone', normalizedPhone)
        .gte('created_at', oneHourAgo)
      
      const maxPerHour = parseInt(process.env.OTP_MAX_REQUESTS_PER_HOUR || '5')
      if (count && count >= maxPerHour) {
        return { success: false, error: 'تجاوزت الحد المسموح من الطلبات. حاول بعد ساعة.' }
      }

      // 2. Cooldown Rate Limiting (60 seconds)
      const cooldownSeconds = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60')
      const cooldownTime = new Date(now.getTime() - cooldownSeconds * 1000).toISOString()
      const { data: recentRequest } = await adminClient
        .from('otp_requests')
        .select('id')
        .eq('phone', normalizedPhone)
        .gte('created_at', cooldownTime)
        .limit(1)

      if (recentRequest && recentRequest.length > 0) {
        return { success: false, error: 'يرجى الانتظار قبل طلب رمز جديد.' }
      }

      // 3. Generate Secure OTP
      const otpCode = crypto.randomInt(100000, 999999).toString()
      const otpHash = this.generateHash(otpCode)
      
      const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES || '5')
      const expiresAt = new Date(now.getTime() + expiresMinutes * 60 * 1000).toISOString()

      // 4. Create PENDING request in DB
      const { data: request, error: insertError } = await adminClient
        .from('otp_requests')
        .insert({
          phone: normalizedPhone,
          otp_hash: otpHash,
          expires_at: expiresAt,
          status: 'PENDING'
        })
        .select('id')
        .single()
        
      if (insertError || !request) {
        return { success: false, error: 'تعذر إعداد طلب التحقق.' }
      }

      // 5. Send via OTPIQ
      const otpiqKey = process.env.OTPIQ_API_KEY
      if (!otpiqKey) {
        // Fallback for Development ONLY IF we are in development
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[DEV ONLY] OTPIQ key missing. OTP is ${otpCode}`);
          return { success: true }
        } else {
          throw new Error('OTPIQ_API_KEY is missing in production')
        }
      }

      const response = await fetch('https://api.otpiq.com/api/sms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${otpiqKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          smsType: 'verification',
          provider: 'whatsapp-telegram-sms',
          verificationCode: otpCode
        })
      })

      if (!response.ok) {
        // Safe to rollback/delete the request so user can try again immediately if API fails
        await adminClient.from('otp_requests').delete().eq('id', request.id)
        
        // Log safe info
        console.error(`OTPIQ Error: Status ${response.status}`);
        return { success: false, error: 'تعذر إرسال الرمز حالياً بسبب مزود الخدمة.' }
      }

      return { success: true }

    } catch (e) {
      console.error('Send OTP Error', e)
      return { success: false, error: 'حدث خطأ غير متوقع.' }
    }
  }

  async verifyOtp(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedPhone = normalizeIraqiPhone(phone)
      
      if (code.length !== 6 || !/^\d+$/.test(code)) {
        return { success: false, error: 'الرمز غير صحيح' }
      }

      const adminClient = this.getAdminClient()
      const now = new Date().toISOString()

      // Find the latest PENDING request for this phone
      const { data: request } = await adminClient
        .from('otp_requests')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('status', 'PENDING')
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!request) {
        return { success: false, error: 'الرمز غير صحيح أو منتهي الصلاحية' }
      }

      // Check max attempts natively before incrementing to avoid race condition where it's already locked
      if (request.attempts >= 5 || request.status === 'LOCKED') {
        return { success: false, error: 'تم إيقاف هذا الطلب بسبب كثرة المحاولات.' }
      }

      // Hash the submitted code and perform constant-time comparison
      const submittedHash = this.generateHash(code)
      
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(submittedHash, 'utf8'),
        Buffer.from(request.otp_hash, 'utf8')
      )

      if (!isMatch) {
        // Increment attempts securely via RPC
        const { data: newAttempts } = await adminClient.rpc('increment_otp_attempt', { request_id: request.id })
        if (newAttempts >= 5) {
          return { success: false, error: 'لقد تجاوزت الحد المسموح. يرجى طلب رمز جديد.' }
        }
        return { success: false, error: 'رمز التحقق غير صحيح.' }
      }

      // Success: Consume the OTP
      const { data: updatedRequest, error: updateError } = await adminClient
        .from('otp_requests')
        .update({
          status: 'VERIFIED',
          consumed_at: now,
          updated_at: now
        })
        .eq('id', request.id)
        .eq('status', 'PENDING') // Double check status to prevent concurrent consumption
        .select('id')
        .single() // Enforce exactly ONE consumption. If 0 rows updated, this throws an error.

      if (updateError || !updatedRequest) {
        return { success: false, error: 'تعذر معالجة الطلب أو تم استهلاكه مسبقاً.' }
      }

      return { success: true }
    } catch (e) {
      console.error('Verify OTP Error', e)
      return { success: false, error: 'حدث خطأ غير متوقع.' }
    }
  }
}

export const otpProvider: OtpProvider = new OtpiqOtpProvider();
