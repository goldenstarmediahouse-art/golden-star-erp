import SignupForm from '@/components/signup-form'
import { getSupabaseConfigError } from '@/lib/supabase/env'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <SignupForm
      configurationError={getSupabaseConfigError()}
      callbackError={error === 'callback'}
      provisioningError={error === 'provision'}
    />
  )
}
