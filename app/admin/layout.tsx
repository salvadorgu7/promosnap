import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Tag,
  Store,
  Clock,
  Settings,
  Zap,
  Upload,
  Bell,
  TrendingUp,
  BarChart3,
  Globe,
  Activity,
  FileText,
  Mail,
  DollarSign,
  Target,
  Brain,
  Gift,
  SearchX,
  HeartPulse,
  ShieldCheck,
  Shield,
  Rocket,
  ClipboardCheck,
  MonitorDot,
  Gauge,
  ShieldAlert,
  Radio,
  Image,
  ShoppingBag,
  Play,
  Plug,
  Search,
  Briefcase,
  Edit,
  Lightbulb,
  Sliders,
  Layers,
  MailPlus,
  RefreshCw,
  Sprout,
  Repeat,
  ListChecks,
  Factory,
  Megaphone,
  Cpu,
} from "lucide-react";
import LogoIcon from "@/components/ui/LogoIcon";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// Primary nav groups — streamlined, no duplicates
const navGroups: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/setup", label: "Setup", icon: Settings },
      { href: "/admin/health", label: "Health", icon: HeartPulse },
    ],
  },
  {
    title: "Catalogo",
    items: [
      { href: "/admin/produtos", label: "Produtos", icon: Package },
      { href: "/admin/ofertas", label: "Ofertas", icon: Tag },
      { href: "/admin/fontes", label: "Fontes", icon: Store },
      { href: "/admin/ingestao", label: "Ingestao", icon: Upload },
      { href: "/admin/sourcing", label: "Sourcing", icon: Package },
      { href: "/admin/banners", label: "Banners", icon: Image },
      { href: "/admin/catalog-density", label: "Densidade", icon: BarChart3 },
      { href: "/admin/supply", label: "Supply", icon: Layers },
    ],
  },
  {
    title: "Monetizacao",
    items: [
      { href: "/admin/attribution", label: "Attribution", icon: Target },
      { href: "/admin/monetizacao", label: "Monetizacao", icon: DollarSign },
      { href: "/admin/analytics", label: "Analytics", icon: Activity },
      { href: "/admin/seo", label: "SEO", icon: Globe },
      { href: "/admin/amazon", label: "Amazon", icon: ShoppingBag },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/admin/growth-ops", label: "Growth & Ops", icon: Rocket },
      { href: "/admin/query-intelligence", label: "Query Intel", icon: Search },
      { href: "/admin/tendencias", label: "Tendencias", icon: TrendingUp },
      { href: "/admin/email", label: "Email", icon: Mail },
      { href: "/admin/alertas", label: "Alertas", icon: Bell },
      { href: "/admin/referrals", label: "Referrals", icon: Gift },
      { href: "/admin/distribution", label: "Distribuicao", icon: Radio },
    ],
  },
  {
    title: "Integracoes",
    items: [
      { href: "/admin/integrations", label: "Integracoes", icon: Plug },
      { href: "/admin/multi-source", label: "Multi-Source", icon: Store },
    ],
  },
  {
    title: "Operacao",
    items: [
      { href: "/admin/jobs", label: "Jobs", icon: Clock },
      { href: "/admin/executions", label: "Execucoes", icon: Play },
      { href: "/admin/monitoring", label: "Monitoring", icon: MonitorDot },
    ],
  },
];

export const metadata: Metadata = {
  title: { default: "Admin | PromoSnap", template: "%s | Admin | PromoSnap" },
  robots: { index: false, follow: false },
};

// Advanced items — collapsed by default
const experimentalItems: NavItem[] = [
  { href: "/admin/cockpit", label: "Cockpit", icon: Gauge },
  { href: "/admin/config", label: "Config", icon: Sliders },
  { href: "/admin/imports", label: "Imports", icon: Layers },
  { href: "/admin/catalog-quality", label: "Qualidade", icon: Gauge },
  { href: "/admin/catalog-intelligence", label: "Intelligence", icon: Brain },
  { href: "/admin/catalog-governance", label: "Governance", icon: ShieldCheck },
  { href: "/admin/catalog-edit", label: "Catalog Edit", icon: Edit },
  { href: "/admin/catalog-opportunities", label: "Oportunidades", icon: Lightbulb },
  { href: "/admin/data-trust", label: "Data Trust", icon: Shield },
  { href: "/admin/seo-gaps", label: "SEO Gaps", icon: SearchX },
  { href: "/admin/automation", label: "Automacao", icon: Zap },
  { href: "/admin/rate-limits", label: "Rate Limits", icon: ShieldAlert },
  { href: "/admin/performance", label: "Performance", icon: Activity },
  { href: "/admin/artigos", label: "Artigos", icon: FileText },
  { href: "/admin/audit", label: "Audit", icon: ClipboardCheck },
  { href: "/admin/business", label: "Business", icon: Briefcase },
  { href: "/admin/inteligencia", label: "Inteligencia", icon: Brain },
  { href: "/admin/email-intelligence", label: "Email Intel", icon: MailPlus },
  { href: "/admin/feed-sync", label: "Feed Sync", icon: RefreshCw },
  { href: "/admin/growth", label: "Growth", icon: Sprout },
  { href: "/admin/habit-loops", label: "Habit Loops", icon: Repeat },
  { href: "/admin/decisoes", label: "Decisoes", icon: ListChecks },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/merchandising", label: "Merchandising", icon: Megaphone },
  { href: "/admin/prioridades", label: "Prioridades", icon: Target },
  { href: "/admin/production", label: "Production", icon: Factory },
  { href: "/admin/runtime", label: "Runtime", icon: Cpu },
  { href: "/admin/release", label: "Release", icon: Rocket },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-surface-200 bg-white flex flex-col" style={{ background: "linear-gradient(180deg, #ffffff 0%, #FAFBFF 100%)" }}>
        <div className="p-4 border-b border-surface-200">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon size={32} />
            <div>
              <span className="text-sm font-bold font-display text-text-primary">PromoSnap</span>
              <span className="block text-[10px] text-text-muted uppercase tracking-wider">Admin</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted px-3 mb-1">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-100 transition-colors"
                  >
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {/* Experimental — collapsed by default */}
          <details className="group/exp">
            <summary className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 px-3 mb-1 cursor-pointer select-none list-none flex items-center gap-1">
              <span className="transition-transform group-open/exp:rotate-90">▸</span>
              Experimental
              <span className="ml-auto text-[9px] font-normal bg-surface-100 text-surface-400 px-1.5 py-0.5 rounded">beta</span>
            </summary>
            <div className="space-y-0.5 mt-1">
              {experimentalItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-400 hover:text-text-secondary hover:bg-surface-100 transition-colors"
                >
                  <item.icon className="h-4 w-4" /> {item.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        <div className="p-3 border-t border-surface-200">
          <Link
            href="/admin/config"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            <Settings className="h-4 w-4" /> Configuracoes
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto" style={{ background: "linear-gradient(180deg, #F6F7FB 0%, #F1F4FA 100%)" }}>{children}</main>
    </div>
  );
}
