"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Tag, TrendingDown, Flame, X, Check } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: "price_drop" | "new_offer" | "hot_deal";
  read: boolean;
  createdAt: string;
}

const TYPE_CONFIG = {
  price_drop: { icon: TrendingDown, color: "text-accent-green", bg: "bg-green-50" },
  new_offer: { icon: Tag, color: "text-accent-blue", bg: "bg-blue-50" },
  hot_deal: { icon: Flame, color: "text-accent-red", bg: "bg-red-50" },
};

const SAMPLE_NOTIFICATIONS: Omit<Notification, "id" | "createdAt" | "read">[] = [
  {
    title: "Novas ofertas disponiveis",
    body: "Encontramos 12 novas ofertas que podem te interessar.",
    type: "new_offer",
  },
  {
    title: "Queda de preco detectada",
    body: "Um produto que voce viu baixou de preco.",
    type: "price_drop",
  },
  {
    title: "Oferta relampago",
    body: "Descontos acima de 40% por tempo limitado.",
    type: "hot_deal",
  },
  {
    title: "Novos cupons adicionados",
    body: "Cupons exclusivos para lojas parceiras.",
    type: "new_offer",
  },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load existing notifications
    let stored: Notification[] = [];
    try {
      const raw = localStorage.getItem("ps_notifications");
      if (raw) stored = JSON.parse(raw);
    } catch {}

    // Generate some if none exist or it's been > 1h since last generation
    if (stored.length === 0) {
      const now = new Date();
      stored = SAMPLE_NOTIFICATIONS.map((n, i) => ({
        ...n,
        id: `notif-${Date.now()}-${i}`,
        read: false,
        createdAt: new Date(now.getTime() - i * 3600000).toISOString(),
      }));
      localStorage.setItem("ps_notifications", JSON.stringify(stored));
    }

    setNotifications(stored);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAsRead(id: string) {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem("ps_notifications", JSON.stringify(updated));
  }

  function markAllRead() {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("ps_notifications", JSON.stringify(updated));
  }

  function removeNotification(id: string) {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    localStorage.setItem("ps_notifications", JSON.stringify(updated));
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-surface-500 hover:text-surface-700 hover:bg-surface-100 transition-colors"
        aria-label="Notificacoes"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-red text-white text-[10px] font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-surface-200 z-50 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
            <h3 className="text-sm font-semibold text-text-primary">Notificacoes</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-accent-blue hover:underline flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const config = TYPE_CONFIG[notif.type];
                const Icon = config.icon;
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-surface-100 last:border-0 transition-colors ${
                      notif.read ? "bg-white" : "bg-accent-blue/5"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${config.bg} flex-shrink-0 mt-0.5`}>
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${notif.read ? "text-text-secondary" : "text-text-primary"}`}>
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-text-muted mt-1">
                        {new Date(notif.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notif.read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="p-1 rounded text-text-muted hover:text-accent-blue transition-colors"
                          title="Marcar como lida"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => removeNotification(notif.id)}
                        className="p-1 rounded text-text-muted hover:text-accent-red transition-colors"
                        title="Remover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 text-surface-300 mx-auto mb-2" />
                <p className="text-xs text-text-muted">Nenhuma notificacao</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
