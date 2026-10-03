"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { loginSchema } from "@/lib/schemas/auth"

export type AuthActionResult = { error?: string }

export async function sendMagicLink(
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({ email: formData.get("email") })
  if (!parsed.success) {
    return { error: "Enter a valid email address." }
  }

  const h = await headers()
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return {}
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
