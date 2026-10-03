import { z } from "zod"

export const credentialsSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export type CredentialsInput = z.infer<typeof credentialsSchema>

export const changePasswordSchema = z.object({
  new_password: z.string().min(6, "Password must be at least 6 characters"),
  confirm_password: z.string(),
}).refine((v) => v.new_password === v.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
