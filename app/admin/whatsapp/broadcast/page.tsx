"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Send,
  Play,
  Eye,
  Clock,
  Settings,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MessageSquare,
  BarChart3,
  History,
  Radio,
  Zap,
  Filter,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────

interface BroadcastChannel {
  id: string
  name: string
  destinationId: string
  isActive: boolean
  timezone: string
  quietHoursStart: number | null
  quietHoursEnd: number | null
  dailyLimit: number
  windowLimit: number
  defaultOfferCount: number
  groupType: string
  tags: string[]
  categoriesInclude: string[]
  categoriesExclude: string[]
  marketplacesInclude: string[]
  marketplacesExclude: string[]
  templateMode: string
  tonality: string
  sentToday: number
  lastSentAt: string | null
  campaigns?: BroadcastCampaign[]
}

interface BroadcastCampaign {
  id: string
  channelId: string
  name: string
  campaignType: string
  schedule: string | null
  isActive: boolean
  offerCount: number
  minScore: number
  minDiscount: number | null
  maxTicket: number | null
  minTicket: number | null
  categorySlugs: string[]
  marketplaces: string[]
  requireImage: boolean
  requireAffiliate: boolean
  prioritizeTopSellers: boolean
  structureType: string
  lastRunAt: string | null
  totalSent: number
}

interface DeliveryLog {
  id: string
  channelName: string
  campaignName: string | null
  status: string
  messageText: string
  offerCount: number
  templateUsed: string
  sentAt: string | null
  createdAt: string
  errorMessage: string | null
}

interface PreviewResult {
  success: boolean
  preview?: {
    text: string
    structure: string
    offerCount: number
    offers: Array<{
      productName: string
      currentPrice: number
      originalPrice: number | null
      discount: number
      sourceName: string
    }>
  }
  error?: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────

function getAdminHeaders(): HeadersInit {
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

// ─── Constants ────────────────────────────────────────────────────────────

const STRUCTURES = [
  { value: "shortlist", label: "Shortlist", desc: "Lista direta de ofertas" },
  { value: "radar", label: "Radar", desc: "Principal + secundárias com contexto" },
  { value: "hero", label: "Hero", desc: "Oferta destaque + alternativas" },
  { value: "comparativo", label: "Comparativo", desc: "Comparação lado a lado" },
  { value: "resumo", label: "Resumo", desc: "Resumo semanal" },
]

const TONALITIES = [
  { value: "curadoria", label: "Curadoria", desc: "Editorial, curado" },
  { value: "direto", label: "Direto", desc: "Prático, objetivo" },
  { value: "editorial", label: "Editorial", desc: "Storytelling" },
  { value: "economico", label: "Econômico", desc: "Foco em economia" },
  { value: "urgente", label: "Urgente", desc: "Preço caiu agora" },
]

const GROUP_TYPES = [
  { value: "geral", label: "Geral" },
  { value: "tech", label: "Tech" },
  { value: "casa", label: "Casa" },
  { value: "ticket-baixo", label: "Ticket Baixo" },
  { value: "premium", label: "Premium" },
]

// ─── Main Component ───────────────────────────────────────────────────────

type Tab = "channel" | "campaigns" | "send" | "history"

export default function BroadcastPage() {
  const [activeTab, setActiveTab] = useState<Tab>("send")
  const [channels, setChannels] = useState<BroadcastChannel[]>([])
  const [history, setHistory] = useState<DeliveryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─── Fetch Data ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [chRes, histRes] = await Promise.all([
        fetch("/api/admin/whatsapp-broadcast/channels", { headers: getAdminHeaders() }),
        fetch("/api/admin/whatsapp-broadcast/history?limit=20", { headers: getAdminHeaders() }),
      ])

      if (chRes.ok) {
        const data = await chRes.json()
        setChannels(data.channels || [])
      }
      if (histRes.ok) {
        const data = await histRes.json()
        setHistory(data.history || [])
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Tabs ─────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: typeof Send }[] = [
    { key: "send", label: "Disparar", icon: Send },
    { key: "channel", label: "Canal", icon: Settings },
    { key: "campaigns", label: "Campanhas", icon: Clock },
    { key: "history", label: "Histórico", icon: History },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Radio className="h-6 w-6" /> WhatsApp Broadcast
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Configure canais, campanhas e dispare ofertas para os grupos
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tab Nav */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-purple-700 shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "send" && (
        <SendTab channels={channels} onSent={fetchData} />
      )}
      {activeTab === "channel" && (
        <ChannelTab channels={channels} onUpdate={fetchData} />
      )}
      {activeTab === "campaigns" && (
        <CampaignsTab channels={channels} onUpdate={fetchData} />
      )}
      {activeTab === "history" && <HistoryTab history={history} onRefresh={fetchData} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEND TAB — Preview + Disparo manual
// ═══════════════════════════════════════════════════════════════════════════

function SendTab({
  channels,
  onSent,
}: {
  channels: BroadcastChannel[]
  onSent: () => void
}) {
  const [channelId, setChannelId] = useState(channels[0]?.id || "")
  const [structure, setStructure] = useState("radar")
  const [tonality, setTonality] = useState("curadoria")
  const [offerCount, setOfferCount] = useState(5)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [loading, setLoading] = useState<"preview" | "send" | null>(null)
  const [sendResult, setSendResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const handlePreview = async () => {
    setLoading("preview")
    setSendResult(null)
    try {
      const res = await fetch("/api/admin/whatsapp-broadcast/preview", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ channelId, structure, tonality, offerCount }),
      })
      const data = await res.json()
      setPreview(data)
    } catch (err) {
      setPreview({
        success: false,
        error: err instanceof Error ? err.message : "Erro",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleSend = async () => {
    if (!confirm("Enviar mensagem agora para o grupo?")) return
    setLoading("send")
    setSendResult(null)
    try {
      const res = await fetch("/api/admin/whatsapp-broadcast/send", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ channelId, structure, tonality, offerCount }),
      })
      const data = await res.json()
      setSendResult({
        success: data.success,
        message: data.success
          ? `Enviado! ${data.offerCount || 0} ofertas (${data.sendResult?.messageId || "ok"})`
          : data.error || "Falha ao enviar",
      })
      if (data.success) onSent()
    } catch (err) {
      setSendResult({
        success: false,
        message: err instanceof Error ? err.message : "Erro",
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Config */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4" /> Disparo Manual
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Canal */}
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Canal</label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {channels.length === 0 && (
                <option value="">Nenhum canal configurado</option>
              )}
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name} ({ch.sentToday}/{ch.dailyLimit} hoje)
                </option>
              ))}
            </select>
          </div>

          {/* Estrutura */}
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Estrutura</label>
            <select
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {STRUCTURES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} — {s.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Tom */}
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Tom</label>
            <select
              value={tonality}
              onChange={(e) => setTonality(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {TONALITIES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} — {t.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Qtd ofertas */}
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">
              Ofertas ({offerCount})
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={offerCount}
              onChange={(e) => setOfferCount(Number(e.target.value))}
              className="w-full mt-2"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={handlePreview}
            disabled={!channelId || loading !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50"
          >
            {loading === "preview" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Preview
          </button>
          <button
            onClick={handleSend}
            disabled={!channelId || loading !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading === "send" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar Agora
          </button>
        </div>

        {/* Send Result */}
        {sendResult && (
          <div
            className={`mt-4 rounded-lg border p-3 text-sm ${
              sendResult.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {sendResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {sendResult.message}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" /> Preview da Mensagem
          </h2>
          {preview.success && preview.preview ? (
            <>
              <div className="flex gap-2 mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                  {preview.preview.structure}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {preview.preview.offerCount} ofertas
                </span>
              </div>
              <pre className="text-xs font-mono bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-text-primary border border-gray-100 max-h-[500px] overflow-y-auto">
                {preview.preview.text}
              </pre>
              {/* Offers summary */}
              <div className="mt-3 space-y-1">
                {preview.preview.offers?.map((o, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-text-muted truncate max-w-[60%]">
                      {o.productName}
                    </span>
                    <div className="flex items-center gap-2">
                      {o.discount > 0 && (
                        <span className="text-red-500 font-medium">
                          -{o.discount}%
                        </span>
                      )}
                      <span className="font-mono font-medium">
                        R$ {o.currentPrice.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-text-muted">{o.sourceName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-red-600">{preview.error || "Erro ao gerar preview"}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CHANNEL TAB — Configuração do canal
// ═══════════════════════════════════════════════════════════════════════════

function ChannelTab({
  channels,
  onUpdate,
}: {
  channels: BroadcastChannel[]
  onUpdate: () => void
}) {
  const [editing, setEditing] = useState<BroadcastChannel | null>(
    channels[0] || null,
  )
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showNew, setShowNew] = useState(false)

  // New channel form
  const [newName, setNewName] = useState("")
  const [newDestId, setNewDestId] = useState("")

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/whatsapp-broadcast/channels", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify(editing),
      })
      const data = await res.json()
      setResult({
        ok: !!data.channel,
        msg: data.channel ? "Salvo!" : data.error || "Erro ao salvar",
      })
      if (data.channel) onUpdate()
    } catch {
      setResult({ ok: false, msg: "Erro de rede" })
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newDestId.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/whatsapp-broadcast/channels", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          name: newName.trim(),
          destinationId: newDestId.trim(),
          isActive: true,
          timezone: "America/Sao_Paulo",
          quietHoursStart: 22,
          quietHoursEnd: 7,
          dailyLimit: 10,
          windowLimit: 1,
          defaultOfferCount: 5,
          groupType: "geral",
          tags: ["geral"],
          categoriesInclude: [],
          categoriesExclude: [],
          marketplacesInclude: [],
          marketplacesExclude: [],
          templateMode: "radar",
          tonality: "curadoria",
        }),
      })
      const data = await res.json()
      if (data.channel) {
        setShowNew(false)
        setNewName("")
        setNewDestId("")
        onUpdate()
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false)
    }
  }

  const update = (field: string, value: unknown) => {
    if (!editing) return
    setEditing({ ...editing, [field]: value })
  }

  return (
    <div className="space-y-4">
      {/* Channel selector + new */}
      <div className="flex items-center gap-3">
        <select
          value={editing?.id || ""}
          onChange={(e) => {
            const ch = channels.find((c) => c.id === e.target.value)
            if (ch) setEditing(ch)
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm flex-1"
        >
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.name} — {ch.destinationId}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowNew(!showNew)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-medium text-purple-600 hover:bg-purple-50"
        >
          <Plus className="h-3.5 w-3.5" /> Novo Canal
        </button>
      </div>

      {/* New channel form */}
      {showNew && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-purple-700">Novo Canal</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Nome</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="PromoSnap Ofertas"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">ID do Grupo</label>
              <input
                type="text"
                value={newDestId}
                onChange={(e) => setNewDestId(e.target.value)}
                placeholder="120363xxx@g.us"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar Canal
          </button>
        </div>
      )}

      {/* Edit channel */}
      {editing && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Settings className="h-4 w-4" /> Configurações do Canal
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-muted">Ativo</label>
              <button
                onClick={() => update("isActive", !editing.isActive)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  editing.isActive ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    editing.isActive ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Nome */}
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Nome</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            {/* Grupo */}
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">ID do Grupo</label>
              <input
                type="text"
                value={editing.destinationId}
                onChange={(e) => update("destinationId", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Tipo do Grupo</label>
              <select
                value={editing.groupType}
                onChange={(e) => update("groupType", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {GROUP_TYPES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            {/* Limite diário */}
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">
                Limite Diário ({editing.dailyLimit} msgs)
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={editing.dailyLimit}
                onChange={(e) => update("dailyLimit", Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Ofertas por msg */}
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">
                Ofertas por Mensagem ({editing.defaultOfferCount})
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={editing.defaultOfferCount}
                onChange={(e) => update("defaultOfferCount", Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Template */}
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Template Padrão</label>
              <select
                value={editing.templateMode}
                onChange={(e) => update("templateMode", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {STRUCTURES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Tom */}
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Tom Padrão</label>
              <select
                value={editing.tonality}
                onChange={(e) => update("tonality", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {TONALITIES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Quiet hours */}
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1 flex items-center gap-1">
                <VolumeX className="h-3 w-3" /> Silêncio (início)
              </label>
              <select
                value={editing.quietHoursStart ?? ""}
                onChange={(e) =>
                  update("quietHoursStart", e.target.value ? Number(e.target.value) : null)
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Desativado</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-text-muted block mb-1 flex items-center gap-1">
                <Volume2 className="h-3 w-3" /> Silêncio (fim)
              </label>
              <select
                value={editing.quietHoursEnd ?? ""}
                onChange={(e) =>
                  update("quietHoursEnd", e.target.value ? Number(e.target.value) : null)
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Desativado</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 pt-3 border-t border-gray-100">
            <div className="text-xs text-text-muted">
              Enviadas hoje: <strong className="text-text-primary">{editing.sentToday}</strong>
            </div>
            {editing.lastSentAt && (
              <div className="text-xs text-text-muted">
                Último envio:{" "}
                <strong className="text-text-primary">
                  {new Date(editing.lastSentAt).toLocaleString("pt-BR")}
                </strong>
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Canal
            </button>
            {result && (
              <span className={`text-sm ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
                {result.msg}
              </span>
            )}
          </div>
        </div>
      )}

      {channels.length === 0 && !showNew && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-text-muted">Nenhum canal configurado</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> Criar Primeiro Canal
          </button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGNS TAB — Campanhas agendadas
// ═══════════════════════════════════════════════════════════════════════════

function CampaignsTab({
  channels,
  onUpdate,
}: {
  channels: BroadcastChannel[]
  onUpdate: () => void
}) {
  const allCampaigns = channels.flatMap((ch) =>
    (ch.campaigns || []).map((c) => ({ ...c, channelName: ch.name })),
  )
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  // New campaign form
  const [newCamp, setNewCamp] = useState({
    channelId: channels[0]?.id || "",
    name: "",
    schedule: "09:00",
    offerCount: 5,
    minScore: 40,
    structureType: "radar",
  })

  const handleCreate = async () => {
    if (!newCamp.name.trim() || !newCamp.channelId) return
    setSaving(true)
    try {
      await fetch("/api/admin/whatsapp-broadcast/campaigns", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          ...newCamp,
          campaignType: "scheduled",
          isActive: true,
          minDiscount: null,
          maxTicket: null,
          minTicket: null,
          categorySlugs: [],
          marketplaces: [],
          requireImage: true,
          requireAffiliate: true,
          prioritizeTopSellers: true,
        }),
      })
      setShowNew(false)
      setNewCamp({ ...newCamp, name: "", schedule: "09:00" })
      onUpdate()
    } catch {
      /* ignore */
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta campanha?")) return
    await fetch(`/api/admin/whatsapp-broadcast/campaigns?id=${id}`, {
      method: "DELETE",
      headers: getAdminHeaders(),
    })
    onUpdate()
  }

  const handleToggle = async (campaign: BroadcastCampaign & { channelName?: string }) => {
    await fetch("/api/admin/whatsapp-broadcast/campaigns", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({ id: campaign.id, isActive: !campaign.isActive }),
    })
    onUpdate()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
          {allCampaigns.length} campanhas
        </h2>
        <button
          onClick={() => setShowNew(!showNew)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-medium text-purple-600 hover:bg-purple-50"
        >
          <Plus className="h-3.5 w-3.5" /> Nova Campanha
        </button>
      </div>

      {/* New campaign form */}
      {showNew && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-purple-700">Nova Campanha</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Canal</label>
              <select
                value={newCamp.channelId}
                onChange={(e) => setNewCamp({ ...newCamp, channelId: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Nome</label>
              <input
                type="text"
                value={newCamp.name}
                onChange={(e) => setNewCamp({ ...newCamp, name: e.target.value })}
                placeholder="Radar da Manhã"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Horário</label>
              <input
                type="text"
                value={newCamp.schedule}
                onChange={(e) => setNewCamp({ ...newCamp, schedule: e.target.value })}
                placeholder="09:00,13:00,18:00"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
              />
              <p className="text-[10px] text-text-muted mt-0.5">Separe horários com vírgula</p>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Ofertas</label>
              <input
                type="number"
                min={1}
                max={10}
                value={newCamp.offerCount}
                onChange={(e) => setNewCamp({ ...newCamp, offerCount: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Score Mínimo</label>
              <input
                type="number"
                min={0}
                max={100}
                value={newCamp.minScore}
                onChange={(e) => setNewCamp({ ...newCamp, minScore: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">Estrutura</label>
              <select
                value={newCamp.structureType}
                onChange={(e) => setNewCamp({ ...newCamp, structureType: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {STRUCTURES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar Campanha
          </button>
        </div>
      )}

      {/* Campaign list */}
      <div className="space-y-2">
        {allCampaigns.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-gray-200 bg-white overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 rounded-full ${c.isActive ? "bg-emerald-500" : "bg-gray-300"}`}
                />
                <div>
                  <span className="text-sm font-medium text-text-primary">{c.name}</span>
                  <span className="text-xs text-text-muted ml-2">({c.channelName})</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-text-muted">{c.schedule || "manual"}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {c.structureType}
                </span>
                <span className="text-xs text-text-muted">{c.totalSent} envios</span>
                {expanded === c.id ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>

            {expanded === c.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-text-muted">Ofertas:</span>{" "}
                    <strong>{c.offerCount}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Score mín:</span>{" "}
                    <strong>{c.minScore}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Imagem:</span>{" "}
                    <strong>{c.requireImage ? "Sim" : "Não"}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Afiliado:</span>{" "}
                    <strong>{c.requireAffiliate ? "Sim" : "Não"}</strong>
                  </div>
                  {c.minDiscount && (
                    <div>
                      <span className="text-text-muted">Desc mín:</span>{" "}
                      <strong>{c.minDiscount}%</strong>
                    </div>
                  )}
                  {c.lastRunAt && (
                    <div>
                      <span className="text-text-muted">Último run:</span>{" "}
                      <strong>{new Date(c.lastRunAt).toLocaleString("pt-BR")}</strong>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleToggle(c)}
                    className={`text-xs px-3 py-1 rounded-lg border ${
                      c.isActive
                        ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                        : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {c.isActive ? "Pausar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 inline mr-1" />
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {allCampaigns.length === 0 && !showNew && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-text-muted">Nenhuma campanha criada</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> Criar Primeira Campanha
          </button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY TAB — Histórico de envios
// ═══════════════════════════════════════════════════════════════════════════

function HistoryTab({
  history,
  onRefresh,
}: {
  history: DeliveryLog[]
  onRefresh: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const statusColor: Record<string, string> = {
    sent: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    dry_run: "bg-blue-100 text-blue-700",
    queued: "bg-amber-100 text-amber-700",
    sending: "bg-blue-100 text-blue-700",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
          Últimos {history.length} envios
        </h2>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-text-muted hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-text-muted">Nenhum envio registrado ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      statusColor[log.status] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {log.status}
                  </span>
                  <span className="text-sm text-text-primary">{log.channelName}</span>
                  {log.campaignName && (
                    <span className="text-xs text-text-muted">· {log.campaignName}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">{log.offerCount} ofertas</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {log.templateUsed}
                  </span>
                  <span className="text-xs text-text-muted">
                    {log.sentAt
                      ? new Date(log.sentAt).toLocaleString("pt-BR")
                      : new Date(log.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>

              {expandedId === log.id && (
                <div className="border-t border-gray-100 p-3 bg-gray-50/50">
                  {log.errorMessage && (
                    <div className="text-xs text-red-600 mb-2">
                      Erro: {log.errorMessage}
                    </div>
                  )}
                  <pre className="text-xs font-mono bg-white rounded-lg p-3 whitespace-pre-wrap text-text-muted border border-gray-100 max-h-[300px] overflow-y-auto">
                    {log.messageText}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
