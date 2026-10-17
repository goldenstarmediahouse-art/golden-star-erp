import Image from 'next/image'
import { redirect } from 'next/navigation'
import ResetPasswordForm from '@/components/reset-password-form'
import { getSupabaseConfigError } from '@/lib/supabase/env'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function ResetPasswordPage() {
  const configurationError = getSupabaseConfigError()
  if (configurationError) {
    return <main className="auth-shell"><section className="auth-form-panel"><div className="auth-form-wrap"><p className="auth-feedback error">{configurationError}</p></div></section></main>
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error && error.name !== 'AuthSessionMissingError') {
    throw new Error(`Could not verify the password reset session: ${error.message}`)
  }
  if (!user) redirect('/login')

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel"><Image className="auth-brand-mark" src="/logo/golden%20star%20logo.png" alt="Golden Star Media House" width={720} height={333} priority /><p className="auth-kicker">ACCOUNT SECURITY</p><p>ERP System</p></section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">Password recovery</p><h2>Choose a new password</h2>
          <p className="auth-subtitle">Set a new password for {user.email}.</p>
          <ResetPasswordForm />
        </div>
      </section>
    </main>
  )
}
