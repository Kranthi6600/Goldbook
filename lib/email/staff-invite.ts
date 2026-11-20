import { resend } from "@/lib/email/resend"

export async function sendStaffInviteEmail({
  to,
  shopName,
  inviteToken,
}: {
  to: string
  shopName: string
  inviteToken: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const inviteUrl = `${appUrl}/invite/${inviteToken}`

  try {
    await resend.emails.send({
      from: "Gold Book <noreply@goldbook.in>",
      to,
      subject: `You're invited to join ${shopName} on Gold Book`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Welcome to Gold Book!</h1>
          <p style="color: #333; font-size: 16px;">
            You've been invited to join <strong>${shopName}</strong> as a staff member.
          </p>
          <p style="color: #333; font-size: 16px;">
            Click the button below to accept the invitation and set up your account:
          </p>
          <div style="margin: 30px 0;">
            <a 
              href="${inviteUrl}" 
              style="
                background-color: #f59e0b; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 6px; 
                display: inline-block;
                font-weight: bold;
              "
            >
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you didn't expect this invitation, you can ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            Gold Book - Every pledge, every paisa — accounted for.
          </p>
        </div>
      `,
    })
  } catch (error) {
    console.error("Failed to send staff invite email:", error)
    throw error
  }
}
