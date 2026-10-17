export type SupabaseConfig = {
  url: string
  publishableKey: string
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart Next.js.',
    )
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.')
  }

  const isLocalHttp =
    parsedUrl.protocol === 'http:' &&
    (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')

  if (
    (parsedUrl.protocol !== 'https:' && !isLocalHttp) ||
    !/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(publishableKey)
  ) {
    throw new Error(
      'Supabase configuration is invalid. Use the HTTPS project URL and a complete sb_publishable_ key.',
    )
  }

  return { url, publishableKey }
}

export function getSupabaseConfigError(): string | null {
  try {
    getSupabaseConfig()
    return null
  } catch (error) {
    if (error instanceof Error) return error.message
    return 'Supabase configuration could not be validated.'
  }
}
