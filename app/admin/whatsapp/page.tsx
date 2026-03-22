"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Phone,
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  RefreshCw,
  Wifi,
  WifiOff,
  Unplug,
  Plug,
  MessageSquare,
  Settings,
  AlertTriangle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────

interface ConnectionStatus {
  configured: boolean
  connected: boolean
  state: "open" | "close" | "connecting" | "unknown"
  instance?: { instanceName: string; state: string }
}

interface QrCodeResponse {
  connected: boolean
  state: string
  qrcode?: string
  message?: string
  error?: string
}

interface DashboardStatus {
  configured: boolean
  connected: boolean
  state: string
  instanceName: string
  apiUrl: string | undefined
}

// ─── Admin Auth ───────────────────────────────────────────────────────────

function getAdminHeaders(): HeadersInit {
  // Lê o cookie admin_token para enviar como header
  const cookies = document.cookie.split(";").reduce(
    (acc, c) => {
      const [k, v] = c.trim().split("=")
      if (k && v) acc[k] = v
      return acc
    },
    {} as Record<string, string>,
  )
  return {
    "Content-Type": "application/json",
    "x-admin-secret": cookies["admin_token"] || "",
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export default function WhatsAppAdminPage() {
  const [dashboard, setDashboard] = useState<DashboardStatus | null>(null)
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrLoading, setQrLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [testGroupId, setTestGroupId] = useState("")
  const [testMessage, setTestMessage] = useState("")
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ─── Fetch Status ───────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const [dashRes, statusRes] = await Promise.all([
        fetch("/api/admin/whatsapp/instance", { headers: getAdminHeaders() }),
        fetch("/api/admin/whatsapp/status", { headers: getAdminHeaders() }),
      ])

      if (dashRes.ok) {
        const d = await dashRes.json()
        setDashboard(d)
      }

      if (statusRes.ok) {
        const s = await statusRes.json()
        setStatus(s)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar status")
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Polling ────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Poll a cada 5s
    return () => clearInterval(interval)
  }, [fetchStatus])

  // Parar polling quando conectado
  useEffect(() => {
    if (status?.connected) {
      setQrCode(null) // Limpar QR code quando conectar
    }
  }, [status?.connected])

  // ─── Actions ────────────────────────────────────────────────────────

  const handleCreateInstance = async () => {
    setActionLoading("create")
    try {
      const res = await fetch("/api/admin/whatsapp/instance", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ action: "create" }),
      })
      const data = await res.json()
      if (data.qrcode) {
        setQrCode(data.qrcode)
      }
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar instância")
    } finally {
      setActionLoading(null)
    }
  }

  const handleGetQrCode = async () => {
    setQrLoading(true)
    try {
      const res = await fetch("/api/admin/whatsapp/qrcode", {
        headers: getAdminHeaders(),
      })
      const data: QrCodeResponse = await res.json()

      if (data.connected) {
        setQrCode(null)
        setStatus((prev) =>
          prev ? { ...prev, connected: true, state: "open" } : prev,
        )
      } else if (data.qrcode) {
        setQrCode(data.qrcode)
      } else {
        setError(data.error || "QR code não disponível")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar QR code")
    } finally {
      setQrLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return
    setActionLoading("disconnect")
    try {
      await fetch("/api/admin/whatsapp/instance", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ action: "disconnect" }),
      })
      setQrCode(null)
      await fetchStatus()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao desconectar",
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleReconnect = async () => {
    setActionLoading("reconnect")
    try {
      const res = await fetch("/api/admin/whatsapp/instance", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ action: "reconnect" }),
      })
      const data = await res.json()
      if (data.qrcode) {
        setQrCode(data.qrcode)
      }
      await fetchStatus()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao reconectar",
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleTestMessage = async () => {
    if (!testGroupId.trim()) {
      setTestResult({
        success: false,
        message: "Informe o ID do grupo (ex: 120363xxx@g.us)",
      })
      return
    }

    setActionLoading("test")
    setTestResult(null)
    try {
      const res = await fetch("/api/admin/whatsapp/status", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          groupId: testGroupId.trim(),
          text:
            testMessage.trim() ||
            "✅ PromoSnap conectado! Este é um teste do sistema de broadcast.",
        }),
      })
      const data = await res.json()
      setTestResult({
        success: data.success,
        message: data.success
          ? `Mensagem enviada! (ID: ${data.messageId || "ok"})`
          : data.error || "Falha ao enviar",
      })
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Erro ao enviar teste",
      })
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  const isConfigured = dashboard?.configured ?? false
  const isConnected = status?.connected ?? false
  const connectionState = status?.state || dashboard?.state || "unknown"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Phone className="h-6 w-6" /> WhatsApp — Evolution API
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Conecte o WhatsApp via QR code para enviar ofertas aos grupos
        </p>
      </div>

      {/* Erro global */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-500 underline mt-1"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Não configurado */}
      {!isConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">
                Evolution API não configurada
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Configure as variáveis de ambiente na Vercel:
              </p>
              <div className="mt-3 space-y-1.5">
                <code className="block text-xs bg-amber-100 rounded px-2 py-1 font-mono text-amber-800">
                  EVOLUTION_API_URL=https://sua-instancia.evolution-api.com
                </code>
                <code className="block text-xs bg-amber-100 rounded px-2 py-1 font-mono text-amber-800">
                  EVOLUTION_API_KEY=sua-chave-aqui
                </code>
                <code className="block text-xs bg-amber-100 rounded px-2 py-1 font-mono text-amber-800">
                  EVOLUTION_INSTANCE_NAME=promosnap (opcional)
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status de conexão */}
      {isConfigured && (
        <>
          {/* Banner de status */}
          <div
            className={`rounded-xl border p-4 ${
              isConnected
                ? "border-emerald-200 bg-emerald-50"
                : connectionState === "connecting"
                  ? "border-blue-200 bg-blue-50"
                  : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-2 shadow-sm ${
                    isConnected ? "bg-emerald-100" : "bg-white/80"
                  }`}
                >
                  {isConnected ? (
                    <Wifi className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {isConnected
                      ? "WhatsApp conectado"
                      : connectionState === "connecting"
                        ? "Conectando..."
                        : "WhatsApp desconectado"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        isConnected
                          ? "bg-emerald-100 text-emerald-700"
                          : connectionState === "connecting"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isConnected
                            ? "bg-emerald-500"
                            : connectionState === "connecting"
                              ? "bg-blue-500 animate-pulse"
                              : "bg-gray-400"
                        }`}
                      />
                      {connectionState}
                    </span>
                    {dashboard?.instanceName && (
                      <span className="text-[10px] text-text-muted font-mono">
                        {dashboard.instanceName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações rápidas */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <button
                    onClick={handleDisconnect}
                    disabled={actionLoading === "disconnect"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === "disconnect" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unplug className="h-3.5 w-3.5" />
                    )}
                    Desconectar
                  </button>
                ) : (
                  <button
                    onClick={handleReconnect}
                    disabled={!!actionLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === "reconnect" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plug className="h-3.5 w-3.5" />
                    )}
                    Reconectar
                  </button>
                )}
                <button
                  onClick={fetchStatus}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          {!isConnected && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <QrCode className="h-4 w-4" /> Conectar via QR Code
              </h2>

              {qrCode ? (
                <div className="flex flex-col items-center gap-4">
                  {/* QR Code Image */}
                  <div className="rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/30 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        qrCode.startsWith("data:")
                          ? qrCode
                          : `data:image/png;base64,${qrCode}`
                      }
                      alt="QR Code WhatsApp"
                      className="w-64 h-64 rounded-lg"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-text-primary">
                      Escaneie com o WhatsApp
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Abra o WhatsApp → Menu (⋮) → Dispositivos conectados →
                      Conectar dispositivo
                    </p>
                  </div>

                  <button
                    onClick={handleGetQrCode}
                    disabled={qrLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-text-muted hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {qrLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Gerar novo QR code
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="rounded-full bg-purple-100 p-4">
                    <QrCode className="h-8 w-8 text-purple-500" />
                  </div>
                  <p className="text-sm text-text-muted text-center max-w-sm">
                    Clique para gerar o QR code e conectar o WhatsApp à
                    instância
                  </p>
                  <button
                    onClick={handleCreateInstance}
                    disabled={!!actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {actionLoading === "create" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="h-4 w-4" />
                    )}
                    Gerar QR Code
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Enviar Mensagem de Teste */}
          {isConnected && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Enviar Mensagem de Teste
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1">
                    ID do Grupo
                  </label>
                  <input
                    type="text"
                    value={testGroupId}
                    onChange={(e) => setTestGroupId(e.target.value)}
                    placeholder="120363xxx@g.us"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none transition-colors"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Copie o ID do grupo do WhatsApp. Formato: 120363...@g.us
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1">
                    Mensagem (opcional)
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="✅ PromoSnap conectado! Este é um teste do sistema de broadcast."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none transition-colors resize-none"
                  />
                </div>

                <button
                  onClick={handleTestMessage}
                  disabled={actionLoading === "test"}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === "test" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar Teste
                </button>

                {testResult && (
                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      testResult.success
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {testResult.message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" /> Configuração
            </h2>
            <div className="space-y-2">
              <ConfigRow
                label="EVOLUTION_API_URL"
                value={dashboard?.apiUrl ? "✓ Configurado" : "Ausente"}
                ok={!!dashboard?.apiUrl}
              />
              <ConfigRow
                label="EVOLUTION_API_KEY"
                value={isConfigured ? "✓ Configurado" : "Ausente"}
                ok={isConfigured}
              />
              <ConfigRow
                label="Instância"
                value={dashboard?.instanceName || "promosnap"}
                ok={true}
              />
              <ConfigRow
                label="Estado"
                value={connectionState}
                ok={connectionState === "open"}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────

function ConfigRow({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-mono text-text-muted">{label}</span>
      <span
        className={`text-xs font-mono ${ok ? "text-emerald-600" : "text-red-500"}`}
      >
        {value}
      </span>
    </div>
  )
}
