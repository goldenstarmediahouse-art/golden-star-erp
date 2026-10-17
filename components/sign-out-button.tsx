'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function SignOutButton() {
  const router = useRouter()
  const [error, setError] = useState('')

  async function signOut() {
    setError('')
    try {
      const { error: signOutError } = await createSupabaseBrowserClient().auth.signOut()
      if (signOutError) throw signOutError
      router.replace('/login')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign out failed. Please try again.')
    }
  }

  return (
    <div className="sign-out-area">
      {error && <p className="auth-feedback error" role="alert">{error}</p>}
      <button className="outline-button" type="button" onClick={signOut}><LogOut /> Sign out</button>
    </div>
  )
}
