"use client"

import { useState, useEffect, useCallback } from "react"
import {
  MessageSquare,
  Send,
  Eye,
  Play,
  Pause,
  Plus,
  Settings,
  Clock,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  FileText,
  Radio,
  Hash,
  Calendar,
  TrendingUp,
  DollarSign,
  Target,
  Shield,
  Activity,
  Award,
  Flame,
} from "lucide-react"

// ============================================
// Types (mirrors server types)
// ============================================

interface Channel {
  id: string
  name: string
  destinationId: string
  isActive: boolean
  dailyLimit: number
  defaultOfferCount: number
  groupType: string
  templateMode: string
  tonality: string
  sentToday: number
  lastSentAt: string | null
  campaigns: Campaign[]
}

interface Campaign {
  id: string
  channelId: string
  name: string
  campaignType: string
  schedule: string | null
  isActive: boolean
  offerCount: number
  minScore: number
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
  dryRun: boolean
  sentAt: string | null
  createdAt: string
  errorMessage: string | null
}

interface Stats {
  total: number
  sent: number
  failed: number
  dryRun: number
  todaySent: number
  todayFailed: number
}

// ============================================
// Admin page
// ============================================

export default function WhatsAppBroadcastPage() {
  const [tab, setTab] = useState<"overview" | "channels" | "campaigns" | "preview" | "history" | "templates" | "calendar" | "metrics">("overview")
  const [channels, setChannels] = useState<Channel[]>([])
  const [history, setHistory] = useState<DeliveryLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [broadcastReady, setBroadcastReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [previewOffers, setPreviewOffers] = useState<any[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sendingChannel, setSendingChannel] = useState<string | null>(null)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [channelsRes, historyRes] = await Promise.all([
        fetch("/api/admin/whatsapp-broadcast/channels", {
          headers: { "x-admin-secret": getAdminSecret() },
        }),
        fetch("/api/admin/whatsapp-broadcast/history", {
          headers: { "x-admin-secret": getAdminSecret() },
        }),
      ])

      if (channelsRes.ok) {
        const data = await channelsRes.json()
        setChannels(data.channels || [])
      }

      if (historyRes.ok) {
        const data = await historyRes.json()
        setHistory(data.history || [])
        setStats(data.stats || null)
        setBroadcastReady(data.broadcastReady || false)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Preview
  const generatePreview = async (channelId: string, campaignId?: string) => {
    setPreviewLoading(true)
    setPreviewText(null)
    setPreviewOffers([])
    try {
      const res = await fetch("/api/admin/whatsapp-broadcast/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": getAdminSecret(),
        },
        body: JSON.stringify({ channelId, campaignId }),
      })
      const data = await res.json()
      setPreviewText(data.preview?.text || data.error || "Sem preview")
      setPreviewOffers(data.preview?.offers || [])
    } catch {
      setPreviewText("Erro ao gerar preview")
    } finally {
      setPreviewLoading(false)
    }
  }

  // Send
  const sendBroadcast = async (channelId: string, campaignId?: string) => {
    setSendingChannel(channelId)
    setSendResult(null)
    try {
      const res = await fetch("/api/admin/whatsapp-broadcast/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": getAdminSecret(),
        },
        body: JSON.stringify({ channelId, campaignId }),
      })
      const data = await res.json()
      setSendResult({
        success: data.success,
        message: data.success
          ? `Enviado! ${data.offerCount} ofertas`
          : data.error || "Falha no envio",
      })
      if (data.success) fetchData()
    } catch {
      setSendResult({ success: false, message: "Erro de conexao" })
    } finally {
      setSendingChannel(null)
    }
  }

  // Test
  const sendTest = async (channelId: string) => {
    setSendingChannel(channelId)
    setSendResult(null)
    try {
      const res = await fetch("/api/admin/whatsapp-broadcast/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": getAdminSecret(),
        },
        body: JSON.stringify({ action: "test", channelId }),
      })
      const data = await res.json()
      setSendResult({
        success: data.success,
        message: data.success ? "Teste enviado!" : data.error || "Falha no teste",
      })
    } catch {
      setSendResult({ success: false, message: "Erro de conexao" })
    } finally {
      setSendingChannel(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-text-primary">
              WhatsApp Broadcast
            </h1>
            <p className="text-sm text-text-secondary">
              Motor de envio de ofertas para grupos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            broadcastReady
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {broadcastReady ? (
              <><CheckCircle2 className="w-3 h-3" /> API Conectada</>
            ) : (
              <><AlertTriangle className="w-3 h-3" /> API nao configurada</>
            )}
          </span>
          <button onClick={fetchData} className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <RefreshCw className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Enviados hoje" value={stats.todaySent} icon={<Send className="w-4 h-4" />} color="green" />
          <StatCard label="Falhas hoje" value={stats.todayFailed} icon={<XCircle className="w-4 h-4" />} color="red" />
          <StatCard label="Total enviados" value={stats.sent} icon={<CheckCircle2 className="w-4 h-4" />} color="blue" />
          <StatCard label="Dry-runs" value={stats.dryRun} icon={<Eye className="w-4 h-4" />} color="purple" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-lg p-1">
        {[
          { key: "overview", label: "Visao Geral", icon: <Radio className="w-3.5 h-3.5" /> },
          { key: "channels", label: "Canais", icon: <Hash className="w-3.5 h-3.5" /> },
          { key: "campaigns", label: "Campanhas", icon: <Zap className="w-3.5 h-3.5" /> },
          { key: "preview", label: "Preview", icon: <Eye className="w-3.5 h-3.5" /> },
          { key: "history", label: "Historico", icon: <Clock className="w-3.5 h-3.5" /> },
          { key: "templates", label: "Templates", icon: <FileText className="w-3.5 h-3.5" /> },
          { key: "calendar", label: "Calendario", icon: <Calendar className="w-3.5 h-3.5" /> },
          { key: "metrics", label: "Metricas", icon: <TrendingUp className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              tab === t.key
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {tab === "overview" && (
            <OverviewTab
              channels={channels}
              stats={stats}
              broadcastReady={broadcastReady}
              onPreview={generatePreview}
              onSend={sendBroadcast}
              onTest={sendTest}
              sendingChannel={sendingChannel}
              sendResult={sendResult}
            />
          )}

          {tab === "channels" && (
            <ChannelsTab channels={channels} onRefresh={fetchData} />
          )}

          {tab === "campaigns" && (
            <CampaignsTab channels={channels} onRefresh={fetchData} />
          )}

          {tab === "preview" && (
            <PreviewTab
              channels={channels}
              previewText={previewText}
              previewOffers={previewOffers}
              previewLoading={previewLoading}
              onGenerate={generatePreview}
            />
          )}

          {tab === "history" && (
            <HistoryTab history={history} />
          )}

          {tab === "templates" && (
            <TemplatesTab />
          )}

          {tab === "calendar" && (
            <CalendarTab />
          )}

          {tab === "metrics" && (
            <MetricsTab />
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function StatCard({ label, value, icon, color }: {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
}) {
  const colors: Record<string, string> = {
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  }

  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-6 h-6 rounded-md flex items-center justify-center ${colors[color] || colors.blue}`}>
          {icon}
        </span>
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <p className="text-lg font-bold font-display text-text-primary">{value}</p>
    </div>
  )
}

function OverviewTab({
  channels,
  stats,
  broadcastReady,
  onPreview,
  onSend,
  onTest,
  sendingChannel,
  sendResult,
}: {
  channels: Channel[]
  stats: Stats | null
  broadcastReady: boolean
  onPreview: (channelId: string, campaignId?: string) => void
  onSend: (channelId: string, campaignId?: string) => void
  onTest: (channelId: string) => void
  sendingChannel: string | null
  sendResult: { success: boolean; message: string } | null
}) {
  return (
    <div className="space-y-4">
      {/* Send result banner */}
      {sendResult && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          sendResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {sendResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {sendResult.message}
        </div>
      )}

      {/* Active channels */}
      {channels.map(channel => (
        <div key={channel.id} className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${channel.isActive ? "bg-green-500" : "bg-surface-300"}`} />
              <h3 className="font-semibold text-sm">{channel.name}</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-text-secondary">
                {channel.groupType}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPreview(channel.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-100 hover:bg-surface-200 transition-colors"
              >
                <Eye className="w-3 h-3" /> Preview
              </button>
              <button
                onClick={() => onTest(channel.id)}
                disabled={!broadcastReady || sendingChannel === channel.id}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <Zap className="w-3 h-3" /> Teste
              </button>
              <button
                onClick={() => onSend(channel.id)}
                disabled={!broadcastReady || sendingChannel === channel.id}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <Send className="w-3 h-3" /> Enviar
              </button>
            </div>
          </div>

          {/* Channel info */}
          <div className="flex flex-wrap gap-3 text-[11px] text-text-secondary">
            <span>Limite: {channel.dailyLimit}/dia</span>
            <span>Ofertas: {channel.defaultOfferCount}</span>
            <span>Template: {channel.templateMode}</span>
            <span>Tom: {channel.tonality}</span>
            <span>Hoje: {channel.sentToday} envios</span>
            {channel.lastSentAt && (
              <span>Ultimo: {new Date(channel.lastSentAt).toLocaleString("pt-BR")}</span>
            )}
          </div>

          {/* Campaigns */}
          {channel.campaigns.length > 0 && (
            <div className="border-t border-surface-100 pt-2 mt-2">
              <p className="text-[10px] font-semibold text-text-secondary uppercase mb-1.5">Campanhas</p>
              <div className="space-y-1.5">
                {channel.campaigns.map(camp => (
                  <div key={camp.id} className="flex items-center justify-between bg-surface-50 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${camp.isActive ? "bg-green-500" : "bg-surface-300"}`} />
                      <span className="text-xs font-medium">{camp.name}</span>
                      {camp.schedule && (
                        <span className="text-[10px] text-text-secondary flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {camp.schedule}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-text-secondary">
                        {camp.totalSent} envios | {camp.offerCount} ofertas
                      </span>
                      <button
                        onClick={() => onPreview(channel.id, camp.id)}
                        className="p-1 rounded hover:bg-surface-200 transition-colors"
                        title="Preview desta campanha"
                      >
                        <Eye className="w-3 h-3 text-text-secondary" />
                      </button>
                      <button
                        onClick={() => onSend(channel.id, camp.id)}
                        disabled={!broadcastReady || sendingChannel === channel.id}
                        className="p-1 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
                        title="Enviar agora"
                      >
                        <Send className="w-3 h-3 text-green-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {channels.length === 0 && (
        <div className="card p-8 text-center">
          <MessageSquare className="w-8 h-8 text-surface-300 mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Nenhum canal configurado</p>
        </div>
      )}
    </div>
  )
}

function ChannelsTab({ channels, onRefresh }: { channels: Channel[]; onRefresh: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Canais ({channels.length})</h2>
      </div>

      {channels.map(ch => (
        <div key={ch.id} className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{ch.name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              ch.isActive ? "bg-green-100 text-green-700" : "bg-surface-100 text-text-secondary"
            }`}>
              {ch.isActive ? "Ativo" : "Inativo"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="text-text-secondary">Destino:</span>
              <span className="ml-1 font-mono text-[10px]">{ch.destinationId.slice(0, 20)}...</span>
            </div>
            <div>
              <span className="text-text-secondary">Tipo:</span>
              <span className="ml-1 font-medium">{ch.groupType}</span>
            </div>
            <div>
              <span className="text-text-secondary">Limite:</span>
              <span className="ml-1 font-medium">{ch.dailyLimit}/dia</span>
            </div>
            <div>
              <span className="text-text-secondary">Ofertas:</span>
              <span className="ml-1 font-medium">{ch.defaultOfferCount} por envio</span>
            </div>
            <div>
              <span className="text-text-secondary">Template:</span>
              <span className="ml-1 font-medium">{ch.templateMode}</span>
            </div>
            <div>
              <span className="text-text-secondary">Tom:</span>
              <span className="ml-1 font-medium">{ch.tonality}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CampaignsTab({ channels, onRefresh }: { channels: Channel[]; onRefresh: () => void }) {
  const allCampaigns = channels.flatMap(ch =>
    ch.campaigns.map(camp => ({ ...camp, channelName: ch.name }))
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Campanhas ({allCampaigns.length})</h2>
      </div>

      {allCampaigns.map(camp => (
        <div key={camp.id} className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{camp.name}</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-text-secondary">
                {camp.channelName}
              </span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              camp.isActive ? "bg-green-100 text-green-700" : "bg-surface-100 text-text-secondary"
            }`}>
              {camp.isActive ? "Ativa" : "Inativa"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="text-text-secondary">Tipo:</span>
              <span className="ml-1 font-medium">{camp.campaignType}</span>
            </div>
            <div>
              <span className="text-text-secondary">Horario:</span>
              <span className="ml-1 font-medium">{camp.schedule || "Manual"}</span>
            </div>
            <div>
              <span className="text-text-secondary">Ofertas:</span>
              <span className="ml-1 font-medium">{camp.offerCount}</span>
            </div>
            <div>
              <span className="text-text-secondary">Score min:</span>
              <span className="ml-1 font-medium">{camp.minScore}</span>
            </div>
            <div>
              <span className="text-text-secondary">Estrutura:</span>
              <span className="ml-1 font-medium">{camp.structureType}</span>
            </div>
            <div>
              <span className="text-text-secondary">Envios:</span>
              <span className="ml-1 font-medium">{camp.totalSent}</span>
            </div>
            {camp.lastRunAt && (
              <div className="col-span-2">
                <span className="text-text-secondary">Ultimo:</span>
                <span className="ml-1 font-medium">{new Date(camp.lastRunAt).toLocaleString("pt-BR")}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviewTab({
  channels,
  previewText,
  previewOffers,
  previewLoading,
  onGenerate,
}: {
  channels: Channel[]
  previewText: string | null
  previewOffers: any[]
  previewLoading: boolean
  onGenerate: (channelId: string, campaignId?: string) => void
}) {
  const [selectedChannel, setSelectedChannel] = useState<string>(channels[0]?.id || "")

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-sm">Gerar Preview</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
          >
            {channels.map(ch => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>
          <button
            onClick={() => onGenerate(selectedChannel)}
            disabled={previewLoading || !selectedChannel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {previewLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            Gerar Preview
          </button>
        </div>
      </div>

      {previewText && (
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-600" />
            Mensagem (como aparece no WhatsApp)
          </h3>
          <div className="bg-[#e5ddd5] rounded-lg p-4">
            <div className="bg-white rounded-lg p-3 shadow-sm max-w-md">
              <pre className="text-[13px] font-sans whitespace-pre-wrap leading-relaxed text-gray-800">
                {previewText}
              </pre>
            </div>
          </div>

          {previewOffers.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-secondary mb-2">
                Ofertas selecionadas ({previewOffers.length}):
              </h4>
              <div className="space-y-1">
                {previewOffers.map((o: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-surface-50 rounded-md px-2.5 py-1.5 text-[11px]">
                    <span className="truncate flex-1">{i + 1}. {o.productName}</span>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="font-bold text-accent-green">R$ {o.currentPrice?.toFixed(2)}</span>
                      {o.discount > 0 && (
                        <span className="text-accent-red font-semibold">-{o.discount}%</span>
                      )}
                      <span className="text-text-secondary">{o.sourceName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryTab({ history }: { history: DeliveryLog[] }) {
  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-sm">Historico de Envios ({history.length})</h2>

      {history.length === 0 ? (
        <div className="card p-8 text-center">
          <Clock className="w-8 h-8 text-surface-300 mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Nenhum envio registrado</p>
        </div>
      ) : (
        history.map(log => (
          <div key={log.id} className="card p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={log.status} dryRun={log.dryRun} />
                <span className="text-xs font-medium">{log.channelName}</span>
                {log.campaignName && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-text-secondary">
                    {log.campaignName}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-text-secondary">
                {log.sentAt
                  ? new Date(log.sentAt).toLocaleString("pt-BR")
                  : new Date(log.createdAt).toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="flex gap-3 text-[10px] text-text-secondary">
              <span>{log.offerCount} ofertas</span>
              <span>Template: {log.templateUsed}</span>
              {log.errorMessage && (
                <span className="text-red-600">{log.errorMessage}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<any>(null)

  useEffect(() => {
    fetch("/api/admin/whatsapp-broadcast/history?view=templates", {
      headers: { "x-admin-secret": getAdminSecret() },
    })
      .then(r => r.json())
      .then(d => setTemplates(d.templates))
      .catch(() => {})
  }, [])

  if (!templates) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-sm">Biblioteca de Templates</h2>

      {Object.entries(templates.openings || {}).map(([key, values]: [string, any]) => (
        <div key={key} className="card p-3">
          <h3 className="text-xs font-semibold uppercase text-text-secondary mb-2">
            Aberturas: {key}
          </h3>
          <div className="space-y-1">
            {values.map((v: string, i: number) => (
              <p key={i} className="text-xs text-text-primary bg-surface-50 rounded px-2 py-1">
                {i + 1}. {v}
              </p>
            ))}
          </div>
        </div>
      ))}

      <div className="card p-3">
        <h3 className="text-xs font-semibold uppercase text-text-secondary mb-2">
          Transicoes
        </h3>
        <div className="space-y-1">
          {(templates.transitions || []).map((v: string, i: number) => (
            <p key={i} className="text-xs text-text-primary bg-surface-50 rounded px-2 py-1">
              {i + 1}. {v}
            </p>
          ))}
        </div>
      </div>

      {Object.entries(templates.ctas || {}).map(([key, values]: [string, any]) => (
        <div key={key} className="card p-3">
          <h3 className="text-xs font-semibold uppercase text-text-secondary mb-2">
            CTAs: {key}
          </h3>
          <div className="space-y-1">
            {values.map((v: string, i: number) => (
              <p key={i} className="text-xs text-text-primary bg-surface-50 rounded px-2 py-1">
                {i + 1}. {v}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// Calendar Tab — Promotional Calendar (Mega Prompt 03)
// ============================================

function CalendarTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/whatsapp-broadcast/calendar", {
      headers: { "x-admin-secret": getAdminSecret() },
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSkeleton />
  if (!data) return <div className="card p-8 text-center text-sm text-text-secondary">Falha ao carregar calendario</div>

  const phaseColors: Record<string, string> = {
    draft: "bg-surface-100 text-text-secondary",
    scheduled: "bg-blue-100 text-blue-700",
    warmup: "bg-amber-100 text-amber-700",
    active: "bg-green-100 text-green-700",
    reinforcement: "bg-purple-100 text-purple-700",
    winding_down: "bg-orange-100 text-orange-700",
    ended: "bg-surface-100 text-text-secondary",
    recyclable: "bg-cyan-100 text-cyan-700",
  }

  const phaseLabels: Record<string, string> = {
    draft: "Rascunho",
    scheduled: "Agendado",
    warmup: "Aquecimento",
    active: "Ativo",
    reinforcement: "Reforco",
    winding_down: "Encerrando",
    ended: "Encerrado",
    recyclable: "Reciclavel",
  }

  return (
    <div className="space-y-6">
      {/* Active Events */}
      {data.activeEvents?.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Eventos Ativos Agora
          </h2>
          {data.activeEvents.map((evt: any) => (
            <div key={evt.id} className="card p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{evt.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${phaseColors[evt.phase] || phaseColors.draft}`}>
                  {phaseLabels[evt.phase] || evt.phase}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-text-secondary">
                <span>Periodo: {evt.startDate} a {evt.endDate}</span>
                <span>Prioridade: {evt.priority}/10</span>
                <span>Ofertas: {evt.defaultOfferCount}</span>
                <span>Freq: {evt.defaultFrequency}x/dia</span>
                <span>Estrutura: {evt.defaultStructure}</span>
                <span>Tom: {evt.defaultTonality}</span>
              </div>
              {evt.categories?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {evt.categories.map((c: string) => (
                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-text-secondary">{c}</span>
                  ))}
                </div>
              )}
              {evt.marketplaces?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {evt.marketplaces.map((m: string) => (
                    <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{m}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upcoming Events */}
      {data.upcomingEvents?.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Proximos Eventos (60 dias)
          </h2>
          {data.upcomingEvents.map((evt: any) => (
            <div key={evt.id} className="card p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-xs">{evt.name}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${phaseColors[evt.phase] || phaseColors.draft}`}>
                    {phaseLabels[evt.phase] || evt.phase}
                  </span>
                </div>
                <span className="text-[10px] text-text-secondary">P{evt.priority}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-text-secondary">
                <span>{evt.startDate} → {evt.endDate}</span>
                <span>Aquec: {evt.warmupDays}d</span>
                <span>Reforco: {evt.reinforcementDays}d</span>
                <span>{evt.defaultOfferCount} ofertas</span>
                <span>{evt.defaultFrequency}x/dia</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Calendar */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-secondary" />
          Calendario Completo ({data.currentMonth})
        </h2>
        <div className="grid gap-2">
          {(data.calendar || []).map((evt: any) => (
            <div key={evt.id} className="card p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${evt.isActive ? "bg-green-500" : "bg-surface-300"}`} />
                <span className="text-xs font-medium">{evt.name}</span>
                <span className="text-[10px] text-text-secondary">{evt.startDate} → {evt.endDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${phaseColors[evt.phase] || phaseColors.draft}`}>
                  {phaseLabels[evt.phase] || evt.phase}
                </span>
                <span className="text-[10px] text-text-secondary">P{evt.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Templates */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-500" />
          Templates de Campanha ({(data.templates || []).length})
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(data.templates || []).map((tpl: any) => (
            <div key={tpl.id} className="card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold">{tpl.name}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-text-secondary">{tpl.structure}</span>
              </div>
              <p className="text-[10px] text-text-secondary">{tpl.description}</p>
              <div className="flex flex-wrap gap-2 text-[10px] text-text-secondary">
                <span>Score min: {tpl.minScore}</span>
                <span>Ofertas: {tpl.offerCount}</span>
                <span>Tom: {tpl.tonality}</span>
                <span>Horarios: {tpl.preferredHours?.join(", ")}</span>
                {tpl.maxTicket && <span>Max: R${tpl.maxTicket}</span>}
                {tpl.minTicket && <span>Min: R${tpl.minTicket}</span>}
                {tpl.minDiscount && <span>Desc min: {tpl.minDiscount}%</span>}
              </div>
              {tpl.categorySlugs?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tpl.categorySlugs.map((c: string) => (
                    <span key={c} className="text-[9px] px-1 py-0.5 rounded bg-purple-50 text-purple-700">{c}</span>
                  ))}
                </div>
              )}
              {tpl.marketplaces?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tpl.marketplaces.map((m: string) => (
                    <span key={m} className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-700">{m}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Metrics Tab — Revenue Analytics (Mega Prompt 04)
// ============================================

function MetricsTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/whatsapp-broadcast/metrics", {
      headers: { "x-admin-secret": getAdminSecret() },
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSkeleton />
  if (!data) return <div className="card p-8 text-center text-sm text-text-secondary">Falha ao carregar metricas</div>

  const { summary, kpis } = data

  const tierColors: Record<string, string> = {
    hero: "bg-green-100 text-green-800",
    good: "bg-blue-100 text-blue-700",
    promising: "bg-cyan-100 text-cyan-700",
    stable: "bg-surface-100 text-text-secondary",
    tired: "bg-amber-100 text-amber-700",
    weak: "bg-orange-100 text-orange-700",
    pause: "bg-red-100 text-red-700",
    kill: "bg-red-200 text-red-800",
    consistent: "bg-blue-100 text-blue-700",
  }

  const tierLabels: Record<string, string> = {
    hero: "Hero",
    good: "Boa",
    promising: "Promissora",
    stable: "Estavel",
    tired: "Cansada",
    weak: "Fraca",
    pause: "Pausar",
    kill: "Encerrar",
    consistent: "Consistente",
  }

  const severityColors: Record<string, string> = {
    critical: "bg-red-50 border-red-200 text-red-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  }

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      {summary && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-500" />
            Dashboard Executivo
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Receita Assistida"
              value={`R$ ${(summary.estimatedRevenue || 0).toFixed(2)}`}
              icon={<DollarSign className="w-4 h-4" />}
              color="green"
            />
            <StatCard
              label="Receita/Msg"
              value={`R$ ${(summary.revenuePerMessage || 0).toFixed(2)}`}
              icon={<TrendingUp className="w-4 h-4" />}
              color="blue"
            />
            <StatCard
              label="Fadiga"
              value={`${summary.fatigueScore || 0}%`}
              icon={<Activity className="w-4 h-4" />}
              color={summary.fatigueScore > 60 ? "red" : "green"}
            />
            <StatCard
              label="Trust Score"
              value={`${summary.trustScore || 100}%`}
              icon={<Shield className="w-4 h-4" />}
              color={summary.trustScore < 80 ? "red" : "green"}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Enviados"
              value={summary.totalSent || 0}
              icon={<Send className="w-4 h-4" />}
              color="blue"
            />
            <StatCard
              label="Falhas"
              value={summary.totalFailed || 0}
              icon={<XCircle className="w-4 h-4" />}
              color="red"
            />
            <StatCard
              label="Provider Health"
              value={`${summary.providerHealth || 100}%`}
              icon={<CheckCircle2 className="w-4 h-4" />}
              color={summary.providerHealth < 90 ? "red" : "green"}
            />
            <StatCard
              label="Alertas"
              value={summary.alertCount || 0}
              icon={<AlertTriangle className="w-4 h-4" />}
              color={summary.criticalAlerts > 0 ? "red" : "purple"}
            />
          </div>
        </div>
      )}

      {/* Alerts */}
      {kpis?.alerts?.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Alertas ({kpis.alerts.length})
          </h2>
          {kpis.alerts.map((alert: any) => (
            <div key={alert.id} className={`card p-3 border ${severityColors[alert.severity] || severityColors.info}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{alert.message}</span>
                <span className="text-[10px] font-semibold uppercase">{alert.severity}</span>
              </div>
              <div className="flex gap-3 text-[10px] mt-1 opacity-75">
                <span>Tipo: {alert.type}</span>
                <span>Valor: {alert.value}</span>
                <span>Limiar: {alert.threshold}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Scorecards */}
      {kpis?.campaignScoreboards?.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-500" />
            Ranking de Campanhas
          </h2>
          {kpis.campaignScoreboards.map((card: any) => (
            <div key={card.campaignId} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{card.campaignName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tierColors[card.tier] || tierColors.stable}`}>
                    {tierLabels[card.tier] || card.tier}
                  </span>
                </div>
                <span className="text-sm font-bold text-brand-500">{card.overallScore}pts</span>
              </div>

              {/* Score bars */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <ScoreBar label="CTR" value={card.ctrScore} />
                <ScoreBar label="Clickout" value={card.clickoutScore} />
                <ScoreBar label="Revenue" value={card.revenueScore} />
                <ScoreBar label="Trust" value={card.trustScore} />
                <ScoreBar label="Fadiga" value={card.fatigueScore} invert />
                <ScoreBar label="Eficiencia" value={card.efficiencyScore} />
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-3 text-[10px] text-text-secondary">
                <span>Envios: {card.totalSent}</span>
                <span>Clickouts est.: {card.estimatedClickouts}</span>
                <span>Receita est.: R$ {card.estimatedRevenue.toFixed(2)}</span>
                <span>Ofertas/msg: {card.avgOfferCount.toFixed(1)}</span>
              </div>

              {/* Recommendation */}
              <div className="bg-surface-50 rounded-md px-3 py-2">
                <p className="text-[11px] text-text-secondary">
                  <Target className="w-3 h-3 inline mr-1" />
                  {card.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Scorecards */}
      {kpis?.templateScoreboards?.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            Ranking de Templates
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {kpis.templateScoreboards.map((tpl: any) => (
              <div key={tpl.templateKey} className="card p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{tpl.templateKey}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tierColors[tpl.tier] || tierColors.stable}`}>
                    {tierLabels[tpl.tier] || tpl.tier}
                  </span>
                </div>
                <div className="flex gap-3 text-[10px] text-text-secondary">
                  <span>CTR: {tpl.ctrAvg.toFixed(1)}%</span>
                  <span>Usos: {tpl.totalUsed}</span>
                  <span>Clicks est.: {tpl.clickEstimate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance by Hour */}
      {kpis?.byHour && Object.keys(kpis.byHour).length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-secondary" />
            Performance por Horario
          </h2>
          <div className="card p-3">
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
              {Array.from({ length: 24 }, (_, h) => {
                const hourData = kpis.byHour[h]
                const sent = hourData?.sent || 0
                const maxSent = Math.max(...Object.values(kpis.byHour).map((d: any) => d.sent || 0), 1)
                const height = sent > 0 ? Math.max(8, Math.round((sent / maxSent) * 40)) : 4
                return (
                  <div key={h} className="flex flex-col items-center gap-0.5">
                    <div
                      className={`w-full rounded-sm transition-all ${sent > 0 ? "bg-brand-400" : "bg-surface-200"}`}
                      style={{ height: `${height}px` }}
                      title={`${h}h: ${sent} envios`}
                    />
                    <span className="text-[8px] text-text-secondary">{h}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* No data state */}
      {(!kpis || kpis.totalSent === 0) && (
        <div className="card p-8 text-center">
          <BarChart3 className="w-8 h-8 text-surface-300 mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Nenhum dado de envio para calcular metricas</p>
          <p className="text-xs text-text-secondary mt-1">Envie ofertas para comecar a ver analytics</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// Score bar mini component
// ============================================

function ScoreBar({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const color = invert
    ? value > 60 ? "bg-red-400" : value > 30 ? "bg-amber-400" : "bg-green-400"
    : value > 60 ? "bg-green-400" : value > 30 ? "bg-amber-400" : "bg-red-400"

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-text-secondary">{label}</span>
        <span className="text-[9px] font-bold">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-surface-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ status, dryRun }: { status: string; dryRun: boolean }) {
  if (dryRun) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
        <Eye className="w-2.5 h-2.5" /> Dry Run
      </span>
    )
  }
  switch (status) {
    case "sent":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
          <CheckCircle2 className="w-2.5 h-2.5" /> Enviado
        </span>
      )
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
          <XCircle className="w-2.5 h-2.5" /> Falhou
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-100 text-text-secondary">
          {status}
        </span>
      )
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[0, 1, 2].map(i => (
        <div key={i} className="card p-4 space-y-2">
          <div className="h-4 w-48 rounded bg-surface-200" />
          <div className="h-3 w-72 rounded bg-surface-100" />
          <div className="h-3 w-56 rounded bg-surface-100" />
        </div>
      ))}
    </div>
  )
}

// ============================================
// Helper: get admin secret from cookie
// ============================================

function getAdminSecret(): string {
  if (typeof document === "undefined") return ""
  const match = document.cookie.match(/admin-auth=([^;]+)/)
  return match ? match[1] : ""
}
