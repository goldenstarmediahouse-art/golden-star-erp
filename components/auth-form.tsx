'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function AuthForm({
  configurationError,
  callbackError,
}: {
  configurationError: string | null
  callbackError: boolean
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(
    callbackError ? 'The sign-in or password recovery link could not be verified. Request a new link and try again.' : '',
  )
  const [busy, setBusy] = useState(false)

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      router.replace('/')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function requestPasswordReset() {
    setError('')
    setMessage('')
    setBusy(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (resetError) throw resetError
      setMessage('If an account exists for that email, a password reset link has been sent.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request a password reset.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="auth-brand-mark">GS</div>
        <p className="auth-kicker">INTERNAL BUSINESS SYSTEM</p>
        <h1>Golden Star<br />Media House</h1>
        <p>ERP System</p>
        <div className="auth-brand-rule" />
        <span>Operational reporting, financial control and department performance.</span>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><div className="auth-brand-mark">GS</div><strong>Golden Star Media House</strong></div>
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to ERP System</h2>
          <p className="auth-subtitle">Use your company account to continue.</p>
          {configurationError && <p className="auth-feedback error" role="alert">{configurationError}</p>}
          {error && <p className="auth-feedback error" role="alert">{error}</p>}
          {message && <p className="auth-feedback success" role="status">{message}</p>}
          <form onSubmit={signIn}>
            <label className="auth-label">Work email
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@goldstarmedia.co.zw" />
            </label>
            <label className="auth-label">Password
              <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
            </label>
            <button className="auth-submit" type="submit" disabled={busy || Boolean(configurationError)}>
              {busy ? 'Please wait…' : 'Sign in'} <ArrowUpRight />
            </button>
          </form>
          <p className="auth-switch">Forgot your password?{' '}
            <button type="button" disabled={busy || Boolean(configurationError) || !email} onClick={requestPasswordReset}>
              Send a reset link
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
