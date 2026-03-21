"use client"

import dynamic from "next/dynamic"

const OnboardingWizard = dynamic(() => import("@/components/engagement/OnboardingWizard"), { ssr: false })
const PushNotificationPrompt = dynamic(() => import("@/components/ui/PushNotificationPrompt"), { ssr: false })

/**
 * Client-side engagement components wrapper.
 * Must be a Client Component because ssr:false dynamic imports
 * are not allowed in Server Components (Next.js 15).
 */
export default function ClientEngagement() {
  return (
    <>
      <OnboardingWizard />
      <PushNotificationPrompt />
    </>
  )
}
