import { ShieldCheck } from "lucide-react";

const STORES = [
  { name: "Amazon", color: "text-[#FF9900]", bg: "bg-[#FF9900]/8" },
  { name: "Mercado Livre", color: "text-[#FFE600]", bg: "bg-[#FFE600]/10" },
  { name: "Shopee", color: "text-[#EE4D2D]", bg: "bg-[#EE4D2D]/8" },
  { name: "Shein", color: "text-[#000]", bg: "bg-black/5" },
];

export default function StoreTrustBar() {
  return (
    <div className="bg-white/60 backdrop-blur-sm border-y border-surface-200/60">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-green" />
            Comparamos preços em:
          </span>
          <div className="flex items-center gap-3">
            {STORES.map((store) => (
              <span
                key={store.name}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${store.bg} ${store.color} border border-current/10`}
              >
                {store.name}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-text-muted hidden sm:inline">
            + mais lojas sendo adicionadas
          </span>
        </div>
      </div>
    </div>
  );
}
