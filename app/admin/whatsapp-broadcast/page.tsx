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
  const [tab, setTab] = useState<"overview" | "channels" | "campaigns" | "preview" | "history" | "templates">("overview")
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
  value: number
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
