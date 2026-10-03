"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
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

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return {
      error: /already/i.test(error.message)
        ? "An account with this email already exists — sign in instead."
        : error.message,
    }
  }

  if (data.session) {
    redirect("/")
  }

  return { error: "Account created — check your email to confirm, then sign in." }
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
