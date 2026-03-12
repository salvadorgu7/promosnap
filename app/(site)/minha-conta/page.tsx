"use client";

import { useState, useEffect } from "react";
import {
  User,
  Heart,
  Clock,
  Bell,
  Search,
  Mail,
  ExternalLink,
  Trash2,
  X,
  TrendingDown,
  Rss,
  ArrowRight,
  Sparkles,
  Package,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface Favorite {
  slug: string;
  name: string;
  imageUrl?: string;
  price?: number;
  addedAt: string;
}

interface RecentlyViewed {
  slug: string;
  name: string;
  imageUrl?: string;
  viewedAt: string;
}

interface Alert {
  id: string;
  listingId: string;
  email: string;
  targetPrice: number;
  isActive: boolean;
  createdAt: string;
  listing?: {
    rawTitle?: string;
    offers?: Array<{ currentPrice: number }>;
  };
}

interface FeedItem {
  id: string;
  type: "price_drop" | "alert_status" | "recent_view" | "recent_search" | "new_product";
  title: string;
  subtitle?: string;
  href?: string;
  imageUrl?: string;
  timestamp: string;
  meta?: {
    oldPrice?: number;
    newPrice?: number;
    alertTarget?: number;
    isActive?: boolean;
  };
}

type Tab = "feed" | "favoritos" | "recentes" | "alertas" | "buscas";

export default function MinhaContaPage() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewed[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [searches, setSearches] = useState<string[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    // Load favorites from localStorage
    try {
      const raw = localStorage.getItem("ps_favorites");
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}

    // Load recently viewed
    try {
      const raw = localStorage.getItem("ps_recently_viewed");
      if (raw) setRecentlyViewed(JSON.parse(raw));
    } catch {}

    // Load searches
    try {
      const raw = localStorage.getItem("ps_searches");
      if (raw) setSearches(JSON.parse(raw));
    } catch {}

    // Also try the other search key
    try {
      if (!localStorage.getItem("ps_searches")) {
        const raw = localStorage.getItem("promosnap_recent_searches");
        if (raw) setSearches(JSON.parse(raw));
      }
    } catch {}

    // Load saved email
    try {
      const stored = localStorage.getItem("ps_email");
      if (stored) {
        setSavedEmail(stored);
        setEmail(stored);
      }
    } catch {}
  }, []);

  // Fetch alerts when email is saved
  useEffect(() => {
    if (!savedEmail) return;
    setAlertsLoading(true);
    fetch(`/api/alerts?email=${encodeURIComponent(savedEmail)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAlerts(data);
        else if (data.alerts) setAlerts(data.alerts);
      })
      .catch(() => {})
      .finally(() => setAlertsLoading(false));
  }, [savedEmail]);

  // Build feed items from all local data + alerts
  useEffect(() => {
    const items: FeedItem[] = [];

    // Add recently viewed items to feed
    recentlyViewed.slice(0, 5).forEach((item, i) => {
      items.push({
        id: `rv-${item.slug}-${i}`,
        type: "recent_view",
        title: item.name,
        subtitle: "Voce visitou este produto",
        href: `/produto/${item.slug}`,
        imageUrl: item.imageUrl,
        timestamp: item.viewedAt,
      });
    });

    // Add alert statuses
    alerts.slice(0, 5).forEach((alert) => {
      const currentPrice = alert.listing?.offers?.[0]?.currentPrice;
      items.push({
        id: `alert-${alert.id}`,
        type: "alert_status",
        title: alert.listing?.rawTitle || `Alerta #${alert.id.slice(0, 8)}`,
        subtitle: alert.isActive
          ? `Monitorando — alvo R$ ${alert.targetPrice.toFixed(2).replace(".", ",")}`
          : "Alerta disparado!",
        href: undefined,
        timestamp: alert.createdAt,
        meta: {
          alertTarget: alert.targetPrice,
          isActive: alert.isActive,
          newPrice: currentPrice,
        },
      });
    });

    // Add recent searches
    searches.slice(0, 5).forEach((query, i) => {
      items.push({
        id: `search-${i}`,
        type: "recent_search",
        title: query,
        subtitle: "Busca recente",
        href: `/busca?q=${encodeURIComponent(query)}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(), // approximate
      });
    });

    // Add favorites with price info as potential price drops
    favorites.slice(0, 5).forEach((fav) => {
      items.push({
        id: `fav-${fav.slug}`,
        type: "price_drop",
        title: fav.name,
        subtitle: fav.price
          ? `Favoritado — R$ ${fav.price.toFixed(2).replace(".", ",")}`
          : "Adicionado aos favoritos",
        href: `/produto/${fav.slug}`,
        imageUrl: fav.imageUrl,
        timestamp: fav.addedAt,
        meta: fav.price ? { newPrice: fav.price } : undefined,
      });
    });

    // Sort by timestamp descending
    items.sort((a, b) => {
      try {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } catch {
        return 0;
      }
    });

    setFeedItems(items.slice(0, 20));
    setFeedLoading(false);
  }, [favorites, recentlyViewed, alerts, searches]);

  function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    localStorage.setItem("ps_email", email.trim());
    setSavedEmail(email.trim());
  }

  function removeFavorite(slug: string) {
    const updated = favorites.filter((f) => f.slug !== slug);
    setFavorites(updated);
    localStorage.setItem("ps_favorites", JSON.stringify(updated));
  }

  function clearRecentlyViewed() {
    setRecentlyViewed([]);
    localStorage.removeItem("ps_recently_viewed");
  }

  function clearSearchHistory() {
    setSearches([]);
    localStorage.removeItem("ps_searches");
    localStorage.removeItem("promosnap_recent_searches");
  }

  function getFeedIcon(type: FeedItem["type"]) {
    switch (type) {
      case "price_drop":
        return <TrendingDown className="h-4 w-4 text-accent-green" />;
      case "alert_status":
        return <Bell className="h-4 w-4 text-accent-orange" />;
      case "recent_view":
        return <Clock className="h-4 w-4 text-accent-blue" />;
      case "recent_search":
        return <Search className="h-4 w-4 text-accent-purple" />;
      case "new_product":
        return <Package className="h-4 w-4 text-brand-500" />;
    }
  }

  function getFeedBadgeColor(type: FeedItem["type"]) {
    switch (type) {
      case "price_drop":
        return "bg-accent-green/10 text-accent-green";
      case "alert_status":
        return "bg-accent-orange/10 text-accent-orange";
      case "recent_view":
        return "bg-accent-blue/10 text-accent-blue";
      case "recent_search":
        return "bg-accent-purple/10 text-accent-purple";
      case "new_product":
        return "bg-brand-500/10 text-brand-500";
    }
  }

  function getFeedLabel(type: FeedItem["type"]) {
    switch (type) {
      case "price_drop":
        return "Favorito";
      case "alert_status":
        return "Alerta";
      case "recent_view":
        return "Visitado";
      case "recent_search":
        return "Busca";
      case "new_product":
        return "Novo";
    }
  }

  function formatRelativeTime(ts: string): string {
    try {
      const diff = Date.now() - new Date(ts).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "agora";
      if (mins < 60) return `${mins}min atras`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h atras`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d atras`;
      return new Date(ts).toLocaleDateString("pt-BR");
    } catch {
      return "";
    }
  }

  const totalFeedCount = feedItems.length;

  const tabs: { id: Tab; label: string; icon: typeof Heart; count?: number }[] = [
    { id: "feed", label: "Meu Feed", icon: Rss, count: totalFeedCount },
    { id: "favoritos", label: "Favoritos", icon: Heart, count: favorites.length },
    { id: "recentes", label: "Recentes", icon: Clock, count: recentlyViewed.length },
    { id: "alertas", label: "Alertas", icon: Bell, count: alerts.filter((a) => a.isActive).length },
    { id: "buscas", label: "Buscas", icon: Search, count: searches.length },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-text-primary flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-blue to-brand-500 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          Minha Conta
        </h1>
        <p className="text-sm text-text-muted mt-2">
          Gerencie seus favoritos, alertas e historico
        </p>
      </div>

      {/* Email section */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-accent-blue" />
          Email para Alertas
        </h2>
        <form onSubmit={handleSaveEmail} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@exemplo.com"
            className="input flex-1 text-sm py-2 px-3"
            required
          />
          <button type="submit" className="btn-primary px-5 py-2 text-sm">
            {savedEmail ? "Atualizar" : "Salvar"}
          </button>
        </form>
        {savedEmail && (
          <p className="text-xs text-accent-green mt-2">
            Alertas vinculados a: {savedEmail}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-surface-100 rounded-lg overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {(tab.count ?? 0) > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? "bg-accent-blue/10 text-accent-blue"
                      : "bg-surface-200 text-text-muted"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {/* ===== MEU FEED ===== */}
        {activeTab === "feed" && (
          <div>
            {feedLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card p-4">
                    <div className="animate-pulse flex items-center gap-4">
                      <div className="w-10 h-10 bg-surface-100 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-surface-100 rounded w-3/4" />
                        <div className="h-2 bg-surface-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : feedItems.length > 0 ? (
              <div className="space-y-1">
                {/* Feed summary bar */}
                <div className="flex items-center gap-3 mb-4 px-1">
                  <Sparkles className="h-4 w-4 text-accent-purple" />
                  <p className="text-sm text-text-muted">
                    {feedItems.length} atividade{feedItems.length > 1 ? "s" : ""} recente{feedItems.length > 1 ? "s" : ""}
                  </p>
                </div>

                {/* Timeline feed */}
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-5 top-3 bottom-3 w-px bg-surface-200/80" />

                  <div className="space-y-1">
                    {feedItems.map((item) => {
                      const Wrapper = item.href ? "a" : "div";
                      const wrapperProps = item.href
                        ? { href: item.href, className: "block" }
                        : { className: "block" };

                      return (
                        <Wrapper key={item.id} {...(wrapperProps as any)}>
                          <div className="relative flex items-start gap-4 p-3 rounded-xl hover:bg-surface-50 transition-colors group">
                            {/* Timeline dot */}
                            <div className={`relative z-10 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getFeedBadgeColor(item.type)}`}>
                              {getFeedIcon(item.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${getFeedBadgeColor(item.type)}`}>
                                  {getFeedLabel(item.type)}
                                </span>
                                <span className="text-[10px] text-text-muted">
                                  {formatRelativeTime(item.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-blue transition-colors">
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-xs text-text-muted mt-0.5 truncate">
                                  {item.subtitle}
                                </p>
                              )}
                              {/* Alert-specific progress */}
                              {item.type === "alert_status" && item.meta && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  {item.meta.isActive ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent-orange">
                                      <AlertCircle className="h-3 w-3" /> Monitorando
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent-green">
                                      <CheckCircle2 className="h-3 w-3" /> Disparado
                                    </span>
                                  )}
                                  {item.meta.newPrice && (
                                    <span className="text-[10px] text-text-muted">
                                      Atual: R$ {item.meta.newPrice.toFixed(2).replace(".", ",")}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Image thumbnail (if available) */}
                            {item.imageUrl && (
                              <div className="w-12 h-12 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}

                            {/* Arrow for clickable items */}
                            {item.href && (
                              <ArrowRight className="h-4 w-4 text-surface-300 group-hover:text-accent-blue flex-shrink-0 mt-1 transition-colors" />
                            )}
                          </div>
                        </Wrapper>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Rss className="h-12 w-12 text-surface-300 mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  Seu feed esta vazio. Explore produtos, adicione favoritos e crie alertas para ver atividades aqui.
                </p>
                <a
                  href="/ofertas"
                  className="btn-primary inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm"
                >
                  Explorar Ofertas
                </a>
              </div>
            )}
          </div>
        )}

        {/* Favorites */}
        {activeTab === "favoritos" && (
          <div>
            {favorites.length > 0 ? (
              <div className="space-y-2">
                {favorites.map((fav) => (
                  <div
                    key={fav.slug}
                    className="card flex items-center gap-4 p-4"
                  >
                    <div className="w-14 h-14 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {fav.imageUrl ? (
                        <img
                          src={fav.imageUrl}
                          alt={fav.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Heart className="h-5 w-5 text-surface-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {fav.name}
                      </p>
                      {fav.price && (
                        <p className="text-sm font-bold text-accent-blue">
                          R$ {fav.price.toFixed(2).replace(".", ",")}
                        </p>
                      )}
                      <p className="text-xs text-text-muted">
                        Adicionado em{" "}
                        {new Date(fav.addedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={`/produto/${fav.slug}`}
                        className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Ver
                      </a>
                      <button
                        onClick={() => removeFavorite(fav.slug)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 text-surface-300 mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  Voce ainda nao tem favoritos. Explore produtos e adicione aqui.
                </p>
                <a
                  href="/ofertas"
                  className="btn-primary inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm"
                >
                  Explorar Ofertas
                </a>
              </div>
            )}
          </div>
        )}

        {/* Recently viewed */}
        {activeTab === "recentes" && (
          <div>
            {recentlyViewed.length > 0 ? (
              <>
                <div className="flex justify-end mb-3">
                  <button
                    onClick={clearRecentlyViewed}
                    className="text-xs text-text-muted hover:text-accent-red transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Limpar historico
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {recentlyViewed.map((item) => (
                    <a
                      key={item.slug}
                      href={`/produto/${item.slug}`}
                      className="card p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-square rounded-lg bg-surface-100 flex items-center justify-center mb-2 overflow-hidden">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Clock className="h-8 w-8 text-surface-300" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-text-primary line-clamp-2">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-text-muted mt-1">
                        {new Date(item.viewedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-surface-300 mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  Nenhum produto visitado recentemente.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Alerts */}
        {activeTab === "alertas" && (
          <div>
            {!savedEmail ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-surface-300 mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  Salve seu email acima para ver seus alertas de preco.
                </p>
              </div>
            ) : alertsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card p-4">
                    <div className="animate-pulse flex items-center gap-4">
                      <div className="w-10 h-10 bg-surface-100 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-surface-100 rounded w-3/4" />
                        <div className="h-2 bg-surface-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const currentPrice = alert.listing?.offers?.[0]?.currentPrice;
                  const percentAway = currentPrice && currentPrice > alert.targetPrice
                    ? Math.round(((currentPrice - alert.targetPrice) / currentPrice) * 100)
                    : 0;
                  const maxDisplay = currentPrice ? currentPrice * 1.3 : alert.targetPrice * 1.5;
                  const range = maxDisplay - alert.targetPrice;
                  const progress = currentPrice && range > 0
                    ? Math.min(100, Math.max(0, ((maxDisplay - currentPrice) / range) * 100))
                    : 0;

                  return (
                    <div key={alert.id} className="card p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${
                            alert.isActive ? "bg-accent-orange/10" : "bg-surface-100"
                          }`}
                        >
                          <Bell
                            className={`h-4 w-4 ${
                              alert.isActive ? "text-accent-orange" : "text-text-muted"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {alert.listing?.rawTitle || `Alerta #${alert.id.slice(0, 8)}`}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {currentPrice && (
                              <span className="text-xs text-text-muted">
                                Atual: R$ {currentPrice.toFixed(2).replace(".", ",")}
                              </span>
                            )}
                            <span className="text-xs text-accent-orange font-medium">
                              Alvo: R$ {alert.targetPrice.toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                            alert.isActive
                              ? "bg-accent-orange/10 text-accent-orange"
                              : "bg-accent-green/10 text-accent-green"
                          }`}
                        >
                          {alert.isActive ? "Ativo" : "Disparado"}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {alert.isActive && currentPrice && (
                        <div className="mt-3">
                          <div className="relative h-1.5 bg-surface-100 rounded-full overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-orange to-accent-green rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          {percentAway > 0 && (
                            <p className="text-[10px] text-text-muted mt-1.5 flex items-center gap-1">
                              <TrendingDown className="w-3 h-3 text-accent-orange" />
                              Faltam {percentAway}% para atingir o alvo
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-surface-300 mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  Nenhum alerta encontrado para {savedEmail}.
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Crie alertas de preco nas paginas de produto.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Searches */}
        {activeTab === "buscas" && (
          <div>
            {searches.length > 0 ? (
              <>
                <div className="flex justify-end mb-3">
                  <button
                    onClick={clearSearchHistory}
                    className="text-xs text-text-muted hover:text-accent-red transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Limpar buscas
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searches.map((query, i) => (
                    <a
                      key={i}
                      href={`/busca?q=${encodeURIComponent(query)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-100 text-sm text-text-secondary hover:bg-surface-200 hover:text-text-primary transition-colors"
                    >
                      <Search className="h-3.5 w-3.5 text-text-muted" />
                      {query}
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-surface-300 mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  Nenhuma busca registrada.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
