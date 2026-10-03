import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { isAdmin } from "@/lib/utils/admin"

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Env vars not configured yet — pass through without session refresh.
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  // Magic-link code landing on a non-callback path (e.g. Supabase fell back
  // to Site URL root) — forward it so sign-in still completes.
  const code = request.nextUrl.searchParams.get("code")
  if (
    code &&
    request.nextUrl.pathname !== "/auth/callback" &&
    request.nextUrl.pathname !== "/p"
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/callback"
    url.search = `?code=${code}`
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh the session so it never expires mid-request.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // /admin/* is founder-only — allowlisted emails via ADMIN_EMAILS.
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !isAdmin(user?.email)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
