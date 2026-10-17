'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setMessage('Your password has been updated.')
      setPassword('')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={updatePassword}>
      {error && <p className="auth-feedback error" role="alert">{error}</p>}
      {message && <p className="auth-feedback success" role="status">{message}</p>}
      <label className="auth-label">New password
        <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Update password'}</button>
    </form>
  )
}
