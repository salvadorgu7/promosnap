import Link from "next/link";
import { LayoutDashboard, Package, Tag, Store, Clock, Settings, Zap, Upload, Bell, TrendingUp } from "lucide-react";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/ofertas", label: "Ofertas", icon: Tag },
  { href: "/admin/fontes", label: "Fontes", icon: Store },
  { href: "/admin/jobs", label: "Jobs", icon: Clock },
  { href: "/admin/ingestao", label: "Ingestão", icon: Upload },
  { href: "/admin/alertas", label: "Alertas", icon: Bell },
  { href: "/admin/tendencias", label: "Tendências", icon: TrendingUp },
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
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-100 transition-colors">
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-surface-200">
          <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors">
            <Settings className="h-4 w-4" /> Configurações
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-6 bg-surface-50 overflow-auto">{children}</main>
    </div>
  );
}
