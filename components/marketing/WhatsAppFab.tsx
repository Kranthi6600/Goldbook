import { MessageCircleIcon } from "lucide-react"

import { salesWaLink } from "@/lib/utils/whatsapp"

export function WhatsAppFab() {
  return (
    <a
      href={salesWaLink("I want to know about gold loan software")}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex size-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircleIcon className="size-6" />
    </a>
  )
}
