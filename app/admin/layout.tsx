import Link from "next/link";
import { LayoutDashboard, Package, Tag, Store, Clock, Settings, Zap } from "lucide-react";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/ofertas", label: "Ofertas", icon: Tag },
  { href: "/admin/fontes", label: "Fontes", icon: Store },
  { href: "/admin/jobs", label: "Jobs", icon: Clock },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-white/[0.06] bg-surface-900 flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold font-display text-white">PromoSnap</span>
              <span className="block text-[10px] text-surface-500 uppercase tracking-wider">Admin</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-400 hover:text-white hover:bg-surface-800 transition-colors">
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-500 hover:text-white hover:bg-surface-800 transition-colors">
            <Settings className="h-4 w-4" /> Configurações
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-6 bg-surface-950 overflow-auto">{children}</main>
    </div>
  );
}
