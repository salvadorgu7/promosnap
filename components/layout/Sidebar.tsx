"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Flame,
  Tag,
  Award,
  BookOpen,
  Ticket,
  Heart,
  TrendingUp,
  GitCompareArrows,
  ChevronLeft,
  ChevronRight,
  Users,
  Radio,
  Gauge,
  PlayCircle,
} from "lucide-react";
import { useState, useEffect } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: string | number | null;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Nav items that show a notification dot (static heuristics)
const NOTIFICATION_PATHS = new Set(["/admin/imports", "/admin/cockpit", "/admin/executions"]);

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { href: "/admin/cockpit", label: "Cockpit", icon: Gauge },
      { href: "/admin/executions", label: "Execucoes", icon: PlayCircle },
      { href: "/", label: "Home", icon: Home },
      { href: "/ofertas", label: "Ofertas", icon: Flame },
      { href: "/mais-vendidos", label: "Trending", icon: TrendingUp },
    ],
  },
  {
    label: "Explorar",
    items: [
      { href: "/categorias", label: "Categorias", icon: Tag },
      { href: "/marcas", label: "Marcas", icon: Award },
      { href: "/cupons", label: "Cupons", icon: Ticket },
      { href: "/lojas", label: "Lojas", icon: GitCompareArrows },
    ],
  },
  {
    label: "Comunidade",
    items: [
      { href: "/canais", label: "Canais", icon: Radio },
      { href: "/guias", label: "Guias", icon: BookOpen },
    ],
  },
  {
    label: "Pessoal",
    items: [
      { href: "/favoritos", label: "Favoritos", icon: Heart },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [favCount, setFavCount] = useState<number>(0);
  const [hasFailedExecutions, setHasFailedExecutions] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ps_favorites");
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavCount(Array.isArray(parsed) ? parsed.length : 0);
      }
    } catch {
      // ignore
    }

    const handleStorage = () => {
      try {
        const stored = localStorage.getItem("ps_favorites");
        if (stored) {
          const parsed = JSON.parse(stored);
          setFavCount(Array.isArray(parsed) ? parsed.length : 0);
        } else {
          setFavCount(0);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Check for failed executions to show notification dot
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/executions?status=failed&limit=1", {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.executions) && data.executions.length > 0) {
          setHasFailedExecutions(true);
        }
      })
      .catch(() => {
        // Silently ignore — sidebar should never break the page
      });
    return () => controller.abort();
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Attach badge counts dynamically
  const getBadge = (href: string): string | number | null => {
    if (href === "/favoritos" && favCount > 0) return favCount;
    return null;
  };

  // Notification dot for items with pending actions
  const hasNotification = (href: string): boolean => {
    // Dynamic: show dot on executions when there are failures
    if (href === "/admin/executions" && hasFailedExecutions) return true;
    // Static heuristics for other admin paths
    if (href === "/admin/imports" || href === "/admin/cockpit") return true;
    return false;
  };

  return (
    <aside
      className={`sidebar-root hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen z-40 transition-all duration-300 ease-out ${
        expanded ? "w-52" : "w-16"
      }`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Dark surface background */}
      <div className="flex flex-col h-full bg-surface-900 border-r border-surface-800">
        {/* Top spacer to align with header */}
        <div className="h-[57px] flex items-center justify-center border-b border-surface-800 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            {expanded ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Nav items grouped */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto sidebar-scrollbar">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {/* Group divider (not for first group) */}
              {gi > 0 && (
                <div className={`my-2 ${expanded ? "mx-3" : "mx-2"}`}>
                  <div className="h-px bg-surface-700/50" />
                </div>
              )}

              {/* Group label (only when expanded) */}
              {expanded && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-surface-500 sidebar-label">
                  {group.label}
                </p>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const badge = getBadge(item.href);
                  const notif = hasNotification(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`sidebar-item group flex items-center gap-3 rounded-lg transition-all duration-200 relative ${
                        expanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"
                      } ${
                        active
                          ? "bg-accent-blue/15 text-accent-blue"
                          : "text-surface-400 hover:text-white hover:bg-surface-800"
                      }`}
                      title={!expanded ? item.label : undefined}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent-blue shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                      )}
                      <div className="relative flex-shrink-0">
                        <Icon
                          className={`w-[18px] h-[18px] ${
                            active ? "stroke-[2.5]" : "group-hover:scale-110"
                          } transition-transform`}
                        />
                        {/* Badge dot when collapsed */}
                        {!expanded && badge !== null && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-blue" />
                        )}
                        {/* Notification dot for pending actions */}
                        {notif && badge === null && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse" />
                        )}
                      </div>
                      {expanded && (
                        <span className="text-sm font-medium whitespace-nowrap sidebar-label flex-1">
                          {item.label}
                        </span>
                      )}
                      {/* Badge count when expanded */}
                      {expanded && badge !== null && (
                        <span className="ml-auto text-[10px] font-bold bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded-full min-w-[18px] text-center sidebar-label">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom branding */}
        <div className="px-2 py-3 border-t border-surface-800 flex-shrink-0">
          {expanded ? (
            <div className="px-3 py-2">
              <p className="text-[10px] text-surface-500 leading-relaxed">
                PromoSnap &copy; {new Date().getFullYear()}
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-accent-blue to-brand-500 opacity-60" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
