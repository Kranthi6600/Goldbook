"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  changePasswordSchema,
  credentialsSchema,
} from "@/lib/schemas/auth"

export type AuthActionResult = { error?: string }

export async function signInWithPassword(
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: "Enter a valid email and password (min 6 characters)." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Wrong email or password."
          : error.message,
    }
  }

  redirect("/")
}

export async function signUpWithPassword(
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: "Enter a valid email and password (min 6 characters)." }
  }

  // Create via admin API — email_confirm:true means no confirmation email is
  // ever sent, so sign-up can't hit Supabase's email rate limits.
  const admin = createAdminClient()
  const { error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  })

  if (createError) {
    return {
      error: /already|exists|registered/i.test(createError.message)
        ? "An account with this email already exists — sign in instead."
        : createError.message,
    }
  }

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (signInError) {
    return { error: "Account created — sign in with your email and password." }
  }

  redirect("/")
}

export async function changePassword(
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = changePasswordSchema.safeParse({
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
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
