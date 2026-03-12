"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function RunAuditButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRun() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/audit/run", {
        method: "POST",
        headers: {
          "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "",
        },
      })
      if (!res.ok) {
        const data = await res.json()
        console.error("Audit failed:", data)
        alert("Erro ao rodar auditoria. Verifique o console.")
        return
      }
      router.refresh()
    } catch (error) {
      console.error("Audit error:", error)
      alert("Erro de rede ao rodar auditoria.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRun}
      disabled={loading}
      className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Rodando..." : "Rodar Auditoria Agora"}
    </button>
  )
}
