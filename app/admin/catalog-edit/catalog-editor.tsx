"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Star, EyeOff, AlertCircle, ChevronLeft, ChevronRight,
  Save, X, Check, Filter,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  status: string;
  featured: boolean;
  hidden: boolean;
  needsReview: boolean;
  editorialScore: number | null;
  updatedAt: Date | string;
  brand: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
}

interface Props {
  products: Product[];
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  page: number;
  totalPages: number;
  total: number;
  search: string;
  statusFilter: string;
  flagsFilter: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-accent-green/10 text-accent-green",
  INACTIVE: "bg-surface-200 text-text-muted",
  PENDING_REVIEW: "bg-accent-orange/10 text-accent-orange",
  MERGED: "bg-accent-purple/10 text-accent-purple",
};

export function CatalogEditor({
  products, categories, brands, page, totalPages, total,
  search: initialSearch, statusFilter, flagsFilter,
}: Props) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  function navigate(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged = {
      search: searchInput,
      status: statusFilter,
      flags: flagsFilter,
      page: page.toString(),
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`/admin/catalog-edit?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: searchInput, page: "1" });
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      imageUrl: p.imageUrl,
      status: p.status,
      featured: p.featured,
      hidden: p.hidden,
      needsReview: p.needsReview,
      editorialScore: p.editorialScore,
    });
  }

  async function saveEdit(id: string) {
    await fetch(`/api/admin/catalog/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    router.refresh();
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  async function bulkAction(action: "feature" | "hide" | "review") {
    if (selected.size === 0) return;
    setBulkLoading(true);
    const updates = Array.from(selected).map((id) => {
      const data: any = {};
      if (action === "feature") data.featured = true;
      if (action === "hide") data.hidden = true;
      if (action === "review") data.needsReview = true;
      return fetch(`/api/admin/catalog/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    });
    await Promise.all(updates);
    setSelected(new Set());
    setBulkLoading(false);
    router.refresh();
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nome, marca, categoria..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <button type="submit" className="px-3 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
            Buscar
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => navigate({ status: e.target.value, page: "1" })}
          className="px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary"
        >
          <option value="">Todos Status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="INACTIVE">Inativo</option>
          <option value="PENDING_REVIEW">Revisao</option>
          <option value="MERGED">Merged</option>
        </select>

        <select
          value={flagsFilter}
          onChange={(e) => navigate({ flags: e.target.value, page: "1" })}
          className="px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary"
        >
          <option value="">Todas Flags</option>
          <option value="featured">Destaque</option>
          <option value="hidden">Oculto</option>
          <option value="needsReview">Revisar</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-lg border border-brand-200">
          <span className="text-sm font-medium text-brand-700">{selected.size} selecionados</span>
          <button
            onClick={() => bulkAction("feature")}
            disabled={bulkLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-accent-orange/10 text-accent-orange rounded-md hover:bg-accent-orange/20"
          >
            <Star className="h-3 w-3" /> Destacar
          </button>
          <button
            onClick={() => bulkAction("hide")}
            disabled={bulkLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-surface-200 text-text-muted rounded-md hover:bg-surface-300"
          >
            <EyeOff className="h-3 w-3" /> Ocultar
          </button>
          <button
            onClick={() => bulkAction("review")}
            disabled={bulkLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-500 rounded-md hover:bg-red-100"
          >
            <AlertCircle className="h-3 w-3" /> Revisar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === products.length && products.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-surface-300"
                  />
                </th>
                <th className="text-left py-3 px-3 text-xs text-text-muted font-medium">Produto</th>
                <th className="text-left py-3 px-3 text-xs text-text-muted font-medium">Marca</th>
                <th className="text-left py-3 px-3 text-xs text-text-muted font-medium">Categoria</th>
                <th className="text-center py-3 px-3 text-xs text-text-muted font-medium">Status</th>
                <th className="text-center py-3 px-3 text-xs text-text-muted font-medium">Flags</th>
                <th className="text-center py-3 px-3 text-xs text-text-muted font-medium">Score</th>
                <th className="text-right py-3 px-3 text-xs text-text-muted font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isEditing = editingId === p.id;
                return (
                  <tr key={p.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded border-surface-300"
                      />
                    </td>
                    <td className="py-2 px-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name || ""}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-surface-200 rounded bg-white text-text-primary"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {p.imageUrl && (
                            <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover bg-surface-100" />
                          )}
                          <span className="text-text-primary font-medium max-w-[250px] truncate">{p.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-text-secondary text-xs">{p.brand?.name || "—"}</td>
                    <td className="py-2 px-3 text-text-secondary text-xs">{p.category?.name || "—"}</td>
                    <td className="py-2 px-3 text-center">
                      {isEditing ? (
                        <select
                          value={editForm.status || "ACTIVE"}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="px-2 py-1 text-xs border border-surface-200 rounded bg-white"
                        >
                          <option value="ACTIVE">Ativo</option>
                          <option value="INACTIVE">Inativo</option>
                          <option value="PENDING_REVIEW">Revisao</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${STATUS_COLORS[p.status] || "bg-surface-100 text-text-muted"}`}>
                          {p.status}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <label className="flex items-center gap-1 text-[10px]">
                            <input
                              type="checkbox"
                              checked={editForm.featured || false}
                              onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })}
                              className="rounded border-surface-300"
                            />
                            <Star className="h-3 w-3 text-accent-orange" />
                          </label>
                          <label className="flex items-center gap-1 text-[10px]">
                            <input
                              type="checkbox"
                              checked={editForm.hidden || false}
                              onChange={(e) => setEditForm({ ...editForm, hidden: e.target.checked })}
                              className="rounded border-surface-300"
                            />
                            <EyeOff className="h-3 w-3 text-text-muted" />
                          </label>
                          <label className="flex items-center gap-1 text-[10px]">
                            <input
                              type="checkbox"
                              checked={editForm.needsReview || false}
                              onChange={(e) => setEditForm({ ...editForm, needsReview: e.target.checked })}
                              className="rounded border-surface-300"
                            />
                            <AlertCircle className="h-3 w-3 text-red-400" />
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {p.featured && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-accent-orange/10 text-accent-orange rounded font-medium" title="Destaque">
                              <Star className="h-3 w-3 inline" />
                            </span>
                          )}
                          {p.hidden && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-surface-200 text-text-muted rounded font-medium" title="Oculto">
                              <EyeOff className="h-3 w-3 inline" />
                            </span>
                          )}
                          {p.needsReview && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-400 rounded font-medium" title="Revisar">
                              <AlertCircle className="h-3 w-3 inline" />
                            </span>
                          )}
                          {!p.featured && !p.hidden && !p.needsReview && (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.editorialScore ?? ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              editorialScore: e.target.value === "" ? null : parseInt(e.target.value),
                            })
                          }
                          className="w-16 px-2 py-1 text-xs border border-surface-200 rounded bg-white text-center"
                          placeholder="—"
                        />
                      ) : (
                        <span className="text-xs text-text-secondary">
                          {p.editorialScore !== null ? p.editorialScore : "—"}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveEdit(p.id)}
                            className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded transition-colors"
                            title="Salvar"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-text-muted hover:bg-surface-100 rounded transition-colors"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 text-text-muted hover:text-accent-blue transition-colors"
                          title="Editar"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="p-8 text-center text-text-muted text-sm">Nenhum produto encontrado.</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Pagina {page} de {totalPages} ({total} produtos)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ page: Math.max(1, page - 1).toString() })}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-surface-200 rounded-lg hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <button
              onClick={() => navigate({ page: Math.min(totalPages, page + 1).toString() })}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-surface-200 rounded-lg hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proximo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
