import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { BRAND } from "@/lib/brand";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Track gold loans, calculate interest automatically, and remind borrowers on WhatsApp. Built for RBI 2025 record-keeping. ₹999/month.",
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Every pledge, every paisa — accounted for. Loans, interest, and WhatsApp reminders in your pocket.",
    type: "website",
    siteName: BRAND.name,
  },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
