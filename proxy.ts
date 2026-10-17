import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfigError, getSupabaseConfig } from './lib/supabase/env'

export async function proxy(request: NextRequest) {
  if (getSupabaseConfigError()) return NextResponse.next({ request })

  const { url, publishableKey } = getSupabaseConfig()
  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.getUser()
  const expiredSession =
    error?.code === 'refresh_token_not_found' ||
    error?.code === 'invalid_refresh_token' ||
    error?.code === 'refresh_token_already_used'

  if (expiredSession) {
    const loginUrl = new URL('/login', request.url)
    response = request.nextUrl.pathname === '/login'
      ? NextResponse.next({ request })
      : NextResponse.redirect(loginUrl)
    request.cookies.getAll()
      .filter(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'))
      .forEach(({ name }) => response.cookies.delete(name))
    return response
  }

  if (error && error.name !== 'AuthSessionMissingError') {
    throw new Error(`Supabase session refresh failed: ${error.message}`)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
