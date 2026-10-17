import AuthForm from '@/components/auth-form'
import { getSupabaseConfigError } from '@/lib/supabase/env'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return <AuthForm configurationError={getSupabaseConfigError()} callbackError={error === 'callback'} />
}
