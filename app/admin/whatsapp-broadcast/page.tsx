import { redirect } from "next/navigation"

/**
 * Legacy route — redireciona para a nova localização.
 */
export default function WhatsAppBroadcastLegacy() {
  redirect("/admin/whatsapp/broadcast")
}
