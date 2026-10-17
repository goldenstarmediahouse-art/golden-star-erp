import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/lib/supabase/env'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const next = request.nextUrl.searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const { url, publishableKey } = getSupabaseConfig()
  const response = NextResponse.redirect(new URL(safeNext, request.url))

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  if (!code) return NextResponse.redirect(new URL('/login?error=callback', request.url))

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL('/login?error=callback', request.url))

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) {
    response.headers.set('Location', new URL('/signup?error=callback', request.url).toString())
    return response
  }

  const metadata = user?.user_metadata
  const departmentId = metadata?.requested_department_id
  if (
    typeof departmentId === 'string' &&
    typeof metadata?.first_name === 'string' &&
    typeof metadata?.last_name === 'string'
  ) {
    const { error: provisionError } = await supabase.rpc('provision_worker_signup', {
      _department_id: departmentId,
      _first_name: metadata.first_name,
      _last_name: metadata.last_name,
    })
    if (provisionError) {
      response.headers.set('Location', new URL('/signup?error=provision', request.url).toString())
      return response
    }
  }

  return response
}
