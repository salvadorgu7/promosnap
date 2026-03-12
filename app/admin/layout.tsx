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
  Lightbulb,
  Target,
  Brain,
  Gift,
  SearchX,
  MailCheck,
  HeartPulse,
  ShieldCheck,
  Rocket,
  ClipboardCheck,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/business", label: "Business OS", icon: BarChart3 },
    ],
  },
  {
    title: "Catalogo",
    items: [
      { href: "/admin/produtos", label: "Produtos", icon: Package },
      { href: "/admin/ofertas", label: "Ofertas", icon: Tag },
      { href: "/admin/fontes", label: "Fontes", icon: Store },
      { href: "/admin/prioridades", label: "Prioridades", icon: Target },
      { href: "/admin/catalog-governance", label: "Catalogo", icon: ShieldCheck },
    ],
  },
  {
    title: "Conteudo",
    items: [
      { href: "/admin/content", label: "Conteudo", icon: FileText },
      { href: "/admin/artigos", label: "Artigos", icon: FileText },
      { href: "/admin/tendencias", label: "Tendencias", icon: TrendingUp },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/admin/seo", label: "SEO", icon: Globe },
      { href: "/admin/analytics", label: "Analise", icon: Activity },
      { href: "/admin/performance", label: "Desempenho", icon: BarChart3 },
      { href: "/admin/referrals", label: "Indicacoes", icon: Gift },
    ],
  },
  {
    title: "Monetizacao",
    items: [
      { href: "/admin/monetizacao", label: "Monetizacao", icon: DollarSign },
    ],
  },
  {
    title: "Engajamento",
    items: [
      { href: "/admin/email", label: "Email", icon: Mail },
      { href: "/admin/alertas", label: "Alertas", icon: Bell },
      { href: "/admin/inteligencia", label: "Inteligencia", icon: Lightbulb },
      { href: "/admin/decisoes", label: "Decisoes", icon: Brain },
      { href: "/admin/seo-gaps", label: "SEO Gaps", icon: SearchX },
      { href: "/admin/email-intelligence", label: "Email Intel", icon: MailCheck },
    ],
  },
  {
    title: "Operacao",
    items: [
      { href: "/admin/jobs", label: "Jobs", icon: Clock },
      { href: "/admin/ingestao", label: "Ingestao", icon: Upload },
      { href: "/admin/health", label: "Health", icon: HeartPulse },
      { href: "/admin/release", label: "Release", icon: Rocket },
      { href: "/admin/audit", label: "Auditoria", icon: ClipboardCheck },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-surface-200 bg-white flex flex-col">
        <div className="p-4 border-b border-surface-200">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-brand-500 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
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
      <main className="flex-1 p-6 bg-surface-50 overflow-auto">{children}</main>
    </div>
  );
}
