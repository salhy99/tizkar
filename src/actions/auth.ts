'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function normalizeLoginName(name: string): Promise<string> {
  if (!name) return ''
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeLoginNameSync(name: string): string {
  if (!name) return ''
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeNameInternal(name: string): string {
  return normalizeLoginNameSync(name)
}

export async function normalizeName(name: string): Promise<string> {
  return normalizeLoginNameSync(name)
}

/**
 * Validates basic name requirements.
 */
function validateNameFormat(name: string): { valid: boolean; error?: string } {
  const normalized = normalizeNameInternal(name)
  if (normalized.length < 2 || normalized.length > 50) {
    return { valid: false, error: 'الاسم يجب أن يكون بين حرفين و 50 حرفاً' }
  }
  return { valid: true }
}

function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Authenticates a user using their Name and Password.
 * Resolves account using canonical login_name_normalized.
 */
export async function loginWithName(name: string, password: string) {
  if (!name || name.trim().length === 0) {
    return { error: 'الاسم مطلوب' }
  }
  if (!password || password.length === 0) {
    return { error: 'كلمة المرور مطلوبة' }
  }

  const canonicalName = normalizeNameInternal(name)

  // Rate limiting (hashed identifier)
  const { checkLoginRateLimit } = await import('@/lib/security/rate-limit')
  const rateLimit = await checkLoginRateLimit(canonicalName)
  if (!rateLimit.success) {
    return { error: rateLimit.error }
  }

  const adminClient = getServiceClient()

  // 1. Resolve Auth User via Profiles login_name_normalized (AUTH_LOGIN_DISPLAY_NAME_LOOKUP_HITS = 0)
  const { data: profile, error: profileErr } = await adminClient
    .from('profiles')
    .select('id, display_name')
    .eq('login_name_normalized', canonicalName)
    .limit(1)
    .maybeSingle()

  if (profileErr || !profile) {
    return { error: 'الاسم أو كلمة المرور غير صحيحة' }
  }

  // 2. Fetch internal Auth user email from auth admin
  const { data: authUserData, error: authUserErr } = await adminClient.auth.admin.getUserById(profile.id)
  if (authUserErr || !authUserData?.user?.email) {
    return { error: 'الاسم أو كلمة المرور غير صحيحة' }
  }

  // 3. Authenticate via Supabase Auth
  const supabase = await createClient()
  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email: authUserData.user.email,
    password: password,
  })

  if (loginErr) {
    console.error('[Auth Error]', loginErr.message)
    return { error: 'الاسم أو كلمة المرور غير صحيحة' }
  }

  return { success: true }
}

/**
 * Registers a new user with Name and Password.
 * Generates an immutable internal account identifier for Supabase Auth.
 */
export async function registerWithName(
  name: string,
  password: string,
  confirmPassword: string
) {
  if (!name || !password || !confirmPassword) {
    return { error: 'جميع الحقول مطلوبة' }
  }

  if (password !== confirmPassword) {
    return { error: 'كلمتا المرور غير متطابقتين' }
  }

  if (password.length < 8) {
    return { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }
  }

  const displayName = name.normalize('NFC').trim().replace(/\s+/g, ' ')
  const canonicalName = normalizeNameInternal(name)
  const formatCheck = validateNameFormat(displayName)
  if (!formatCheck.valid) {
    return { error: formatCheck.error }
  }

  // Creation Rate limiting
  const { checkCreationRateLimit } = await import('@/lib/security/rate-limit')
  const rateLimit = await checkCreationRateLimit()
  if (!rateLimit.success) {
    return { error: rateLimit.error }
  }

  const adminClient = getServiceClient()

  // Exact canonical name availability check via login_name_normalized
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id, display_name')
    .eq('login_name_normalized', canonicalName)
    .limit(1)
    .maybeSingle()

  if (existingProfile) {
    return { error: 'هذا الاسم مستخدم بالفعل، اختر اسماً آخر' }
  }

  // Generate stable immutable account ID for internal Auth email
  const internalAccountId = crypto.randomUUID()
  const internalEmail = `${internalAccountId}@auth.tizkar.internal`

  // Create Auth User
  const { data: signupData, error: signupError } = await adminClient.auth.admin.createUser({
    email: internalEmail,
    password: password,
    email_confirm: true,
    user_metadata: {
      name: displayName,
      internal_account_id: internalAccountId
    },
  })

  if (signupError || !signupData.user) {
    console.error('[Register Error]', signupError?.message)
    return { error: 'حدث خطأ أثناء إنشاء الحساب' }
  }

  // Create Profile with display_name and canonical login_name_normalized
  const { error: profileError } = await adminClient.from('profiles').insert({
    id: signupData.user.id,
    display_name: displayName,
    login_name_normalized: canonicalName,
    role: 'USER',
  })

  if (profileError) {
    console.error('[Register Profile Error]', profileError)
    // Compensation: delete orphan Auth user
    await adminClient.auth.admin.deleteUser(signupData.user.id)
    return { error: 'حدث خطأ أثناء إنشاء الحساب' }
  }

  // Establish Session
  const supabase = await createClient()
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: internalEmail,
    password: password,
  })

  if (loginError) {
    console.error('[Register Login Error]', loginError.message)
    return { error: 'تم إنشاء الحساب بنجاح. يرجى تسجيل الدخول.' }
  }

  return { success: true }
}

/**
 * Checks if a Name is available for registration.
 */
export async function checkNameAvailability(name: string) {
  if (!name || name.trim().length === 0) {
    return { available: false }
  }

  const canonicalName = normalizeNameInternal(name)
  const formatCheck = validateNameFormat(canonicalName)
  if (!formatCheck.valid) {
    return { available: false, error: formatCheck.error }
  }

  const adminClient = getServiceClient()
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id, display_name')
    .eq('login_name_normalized', canonicalName)
    .limit(1)
    .maybeSingle()

  return { available: !existingProfile }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
