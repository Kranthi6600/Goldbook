import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * Magic-link confirm route — token_hash flow.
 *
 * Supabase emails should point at:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink
 *
 * verifyOtp with a token_hash works server-side with no PKCE verifier and no
 * reliance on URL fragments — robust across browsers, devices, and the
 * implicit/PKCE flow_type setting.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") ?? "magiclink"

  if (!tokenHash) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Missing auth token")}`
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "magiclink" | "signup" | "recovery" | "invite" | "email",
  })

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}/`)
}
