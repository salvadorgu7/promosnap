"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ToggleLeft, ToggleRight, Pencil, Trash2, Zap, X, Save } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  bannerType: string;
  priority: number;
  isActive: boolean;
  startAt: Date | string | null;
  endAt: Date | string | null;
  autoMode: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

const BANNER_TYPE_LABELS: Record<string, string> = {
  HERO: "Hero",
  MODAL: "Modal",
  STRIP: "Strip",
  CAROUSEL: "Carousel",
};

const BANNER_TYPE_COLORS: Record<string, string> = {
  HERO: "bg-accent-blue/10 text-accent-blue",
  MODAL: "bg-accent-purple/10 text-accent-purple",
  STRIP: "bg-accent-orange/10 text-accent-orange",
  CAROUSEL: "bg-accent-green/10 text-accent-green",
};

const AUTO_MODE_LABELS: Record<string, string> = {
  "top-offers": "Top Ofertas",
  "top-discount": "Maior Desconto",
  campaign: "Campanha",
};

const emptyForm = {
  title: "",
  subtitle: "",
  imageUrl: "",
  ctaText: "",
  ctaUrl: "",
  bannerType: "HERO",
  priority: 0,
  isActive: true,
  startAt: "",
  endAt: "",
  autoMode: "",
};

export function BannerActions({ banners: initialBanners }: { banners: Banner[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(b: Banner) {
    setEditingId(b.id);
    setForm({
      title: b.title,
      subtitle: b.subtitle || "",
      imageUrl: b.imageUrl || "",
      ctaText: b.ctaText || "",
      ctaUrl: b.ctaUrl || "",
      bannerType: b.bannerType,
      priority: b.priority,
      isActive: b.isActive,
      startAt: b.startAt ? new Date(b.startAt).toISOString().slice(0, 16) : "",
      endAt: b.endAt ? new Date(b.endAt).toISOString().slice(0, 16) : "",
      autoMode: b.autoMode || "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    setLoading(true);
    try {
      const payload = {
        ...form,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
        autoMode: form.autoMode || null,
      };

      if (editingId) {
        await fetch(`/api/admin/banners/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/admin/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      router.refresh();
    } catch (e) {
      console.error("Save banner error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    await fetch(`/api/admin/banners/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Deletar este banner?")) return;
    await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Banner
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="card p-6 border-2 border-brand-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">
              {editingId ? "Editar Banner" : "Novo Banner"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Titulo *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Subtitulo</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Imagem URL</label>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">CTA Texto</label>
              <input
                type="text"
                value={form.ctaText}
                onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">CTA URL</label>
              <input
                type="text"
                value={form.ctaUrl}
                onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Tipo</label>
              <select
                value={form.bannerType}
                onChange={(e) => setForm({ ...form, bannerType: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="HERO">Hero</option>
                <option value="MODAL">Modal</option>
                <option value="STRIP">Strip</option>
                <option value="CAROUSEL">Carousel</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Prioridade</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Auto Mode</label>
              <select
                value={form.autoMode}
                onChange={(e) => setForm({ ...form, autoMode: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Manual</option>
                <option value="top-offers">Top Ofertas</option>
                <option value="top-discount">Maior Desconto</option>
                <option value="campaign">Campanha</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Inicio</label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Fim</label>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <label className="text-xs font-medium text-text-muted">Ativo</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={`${form.isActive ? "text-accent-green" : "text-text-muted"}`}
              >
                {form.isActive ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !form.title}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {initialBanners.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <p className="text-sm">Nenhum banner criado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Titulo</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Tipo</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Modo</th>
                  <th className="text-center py-3 px-4 text-xs text-text-muted font-medium">Prioridade</th>
                  <th className="text-center py-3 px-4 text-xs text-text-muted font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {initialBanners.map((b) => (
                  <tr key={b.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-text-primary">{b.title}</p>
                        {b.subtitle && <p className="text-xs text-text-muted">{b.subtitle}</p>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${BANNER_TYPE_COLORS[b.bannerType] || "bg-surface-100 text-text-muted"}`}>
                        {BANNER_TYPE_LABELS[b.bannerType] || b.bannerType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {b.autoMode ? (
                        <span className="flex items-center gap-1 text-xs text-accent-purple">
                          <Zap className="h-3 w-3" />
                          {AUTO_MODE_LABELS[b.autoMode] || b.autoMode}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">Manual</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-medium text-text-secondary">{b.priority}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggle(b.id, b.isActive)}
                        className={b.isActive ? "text-accent-green" : "text-text-muted"}
                        title={b.isActive ? "Ativo — clique para desativar" : "Inativo — clique para ativar"}
                      >
                        {b.isActive ? <ToggleRight className="h-5 w-5 mx-auto" /> : <ToggleLeft className="h-5 w-5 mx-auto" />}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(b)}
                          className="p-1.5 text-text-muted hover:text-accent-blue transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 text-text-muted hover:text-red-500 transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
