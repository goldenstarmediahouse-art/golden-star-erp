'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type SignupDepartment = { id: string; name: string }

export default function SignupForm({
  configurationError,
  callbackError,
  provisioningError,
}: {
  configurationError: string | null
  callbackError: boolean
  provisioningError: boolean
}) {
  const router = useRouter()
  const [departments, setDepartments] = useState<SignupDepartment[]>([])
  const [departmentId, setDepartmentId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadDepartments() {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data, error: queryError } = await supabase.rpc('list_worker_signup_departments')
        if (queryError) {
          throw new Error('Worker self-signup is not enabled yet. An administrator must apply the approved Supabase migration first.')
        }
        if (!cancelled) {
          const rows = (data ?? []) as SignupDepartment[]
          setDepartments(rows)
          setDepartmentId(rows[0]?.id ?? '')
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load departments.')
      } finally {
        if (!cancelled) setLoadingDepartments(false)
      }
    }

    if (!configurationError) void loadDepartments()
    else setLoadingDepartments(false)

    return () => { cancelled = true }
  }, [configurationError])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!departmentId) {
      setError('Choose an active department.')
      return
    }
    setBusy(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            requested_department_id: departmentId,
          },
        },
      })
      if (signupError) throw signupError

      if (data.session) {
        const { error: provisionError } = await supabase.rpc('provision_worker_signup', {
          _department_id: departmentId,
          _first_name: firstName.trim(),
          _last_name: lastName.trim(),
        })
        if (provisionError) throw provisionError
        router.replace('/')
        router.refresh()
        return
      }

      setMessage('Check your work email to verify the account. After verification, your worker profile and department access will be activated.')
      setPassword('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Worker account creation failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const setupError = provisioningError
    ? 'Your account was created but worker access could not be provisioned. Contact an administrator and ask them to verify the signup migration and selected department.'
    : callbackError
      ? 'The verification link could not be processed. Sign in again or request a new verification email.'
      : ''

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="auth-brand-mark">GS</div>
        <p className="auth-kicker">INTERNAL BUSINESS SYSTEM</p>
        <h1>Golden Star<br />Media House</h1>
        <p>Worker registration</p>
        <div className="auth-brand-rule" />
        <span>Sign up with your work email. Your worker role and department are validated by Supabase before ERP access is granted.</span>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap signup-form-wrap">
          <div className="auth-mobile-brand"><div className="auth-brand-mark">GS</div><strong>Golden Star Media House</strong></div>
          <p className="eyebrow">New employee</p>
          <h2>Create a worker account</h2>
          <p className="auth-subtitle">Your selected department is assigned by the database; role and report access are enforced by RLS.</p>
          {(setupError || configurationError) && <p className="auth-feedback error" role="alert">{configurationError ?? setupError}</p>}
          {error && <p className="auth-feedback error" role="alert">{error}</p>}
          {message && <p className="auth-feedback success" role="status">{message}</p>}
          <form onSubmit={submit}>
            <div className="signup-name-fields">
              <label className="auth-label">First name
                <input autoComplete="given-name" maxLength={80} required value={firstName} onChange={(event) => setFirstName(event.target.value)} />
              </label>
              <label className="auth-label">Last name
                <input autoComplete="family-name" maxLength={80} required value={lastName} onChange={(event) => setLastName(event.target.value)} />
              </label>
            </div>
            <label className="auth-label">Department
              <select required value={departmentId} disabled={loadingDepartments || !departments.length} onChange={(event) => setDepartmentId(event.target.value)}>
                {loadingDepartments && <option value="">Loading departments…</option>}
                {!loadingDepartments && !departments.length && <option value="">No active departments available</option>}
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>
            <label className="auth-label">Work email
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@goldstarmedia.co.zw" />
            </label>
            <label className="auth-label">Password
              <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
            </label>
            <button className="auth-submit" type="submit" disabled={busy || loadingDepartments || !departments.length || Boolean(configurationError)}>
              {busy ? 'Creating account…' : 'Create worker account'} <ArrowUpRight />
            </button>
          </form>
          <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
          <p className="signup-access-note">New accounts receive the worker role only. Workers can access reports for their assigned department; changing roles or departments requires an administrator.</p>
        </div>
      </section>
    </main>
  )
}
