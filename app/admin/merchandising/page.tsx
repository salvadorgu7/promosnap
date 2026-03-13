import {
  ShoppingBag,
  Star,
  Layers,
  Image,
  Gift,
  Megaphone,
  ArrowRight,
  Truck,
  Shield,
  Flame,
  Users,
  Zap,
  Check,
} from "lucide-react";
import Link from "next/link";
import {
  getMerchandisingCandidates,
  getCandidateSummary,
  type MerchandisingSlotType,
  type MerchandisingCandidate,
} from "@/lib/merchandising/candidates";

export const dynamic = "force-dynamic";

const SLOT_CONFIG: Record<
  MerchandisingSlotType,
  { label: string; icon: typeof Star; color: string; bgColor: string; description: string }
> = {
  hero: {
    label: "Hero Banner",
    icon: Image,
    color: "text-accent-blue",
    bgColor: "bg-accent-blue/10",
    description: "Banner principal da homepage — alto impacto visual",
  },
  carousel: {
    label: "Carousel",
    icon: Layers,
    color: "text-accent-purple",
    bgColor: "bg-accent-purple/10",
    description: "Carousel de ofertas quentes — rotacao automatica",
  },
  banner: {
    label: "Banner Promo",
    icon: Megaphone,
    color: "text-accent-orange",
    bgColor: "bg-accent-orange/10",
    description: "Banners promocionais — destaque visual com desconto",
  },
  "deal-of-day": {
    label: "Oferta do Dia",
    icon: Gift,
    color: "text-accent-green",
    bgColor: "bg-accent-green/10",
    description: "Melhor oferta do dia — alto desconto e confianca",
  },
  "promo-strip": {
    label: "Promo Strip",
    icon: Megaphone,
    color: "text-brand-500",
    bgColor: "bg-brand-500/10",
    description: "Faixa promocional — desconto em destaque",
  },
};

const REASON_ICONS: Record<string, typeof Star> = {
  "Alto desconto": Gift,
  "Bom desconto": Gift,
  "Trust elevado": Shield,
  "Trust bom": Shield,
  "Entrega rapida": Truck,
  "Decision value alto": Zap,
  "Community heat": Users,
};

export default async function MerchandisingPage() {
  const [summary, heroCandidates, carouselCandidates, bannerCandidates, dealCandidates, stripCandidates] =
    await Promise.all([
      getCandidateSummary().catch(() => ({
        hero: 0,
        carousel: 0,
        banner: 0,
        "deal-of-day": 0,
        "promo-strip": 0,
      })),
      getMerchandisingCandidates("hero", 5).catch(() => []),
      getMerchandisingCandidates("carousel", 8).catch(() => []),
      getMerchandisingCandidates("banner", 5).catch(() => []),
      getMerchandisingCandidates("deal-of-day", 5).catch(() => []),
      getMerchandisingCandidates("promo-strip", 5).catch(() => []),
    ]);

  const slotData: { slot: MerchandisingSlotType; candidates: MerchandisingCandidate[] }[] = [
    { slot: "hero", candidates: heroCandidates },
    { slot: "deal-of-day", candidates: dealCandidates },
    { slot: "carousel", candidates: carouselCandidates },
    { slot: "banner", candidates: bannerCandidates },
    { slot: "promo-strip", candidates: stripCandidates },
  ];

  const totalCandidates = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-brand-500" />
            Merchandising
          </h1>
          <p className="text-sm text-text-muted">
            Gestao de slots visuais — candidatos ranqueados por score composto
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/automation"
            className="text-xs text-brand-500 hover:underline flex items-center gap-1"
          >
            Regras de Automacao <ArrowRight className="h-3 w-3" />
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-medium">
            <Flame className="h-3 w-3" />
            {totalCandidates} candidatos
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {(Object.keys(SLOT_CONFIG) as MerchandisingSlotType[]).map((slotType) => {
          const config = SLOT_CONFIG[slotType];
          const count = summary[slotType];
          return (
            <div
              key={slotType}
              className="card p-3 border-l-4"
              style={{ borderLeftColor: "var(--brand-500)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded ${config.bgColor} flex items-center justify-center`}>
                  <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                </div>
                <span className="text-xs text-text-muted">{config.label}</span>
              </div>
              <p className="text-xl font-bold font-display text-text-primary">{count}</p>
              <p className="text-[10px] text-text-muted mt-0.5">candidatos disponiveis</p>
            </div>
          );
        })}
      </div>

      {/* Slot sections */}
      {slotData.map(({ slot, candidates }) => {
        const config = SLOT_CONFIG[slot];
        const Icon = config.icon;

        return (
          <div key={slot} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">
                    {config.label}{" "}
                    <span className="text-text-muted font-normal">
                      ({candidates.length} candidatos)
                    </span>
                  </h2>
                  <p className="text-[10px] text-text-muted">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent-green/10 text-accent-green flex items-center gap-1">
                  <Check className="h-2.5 w-2.5" />
                  Auto
                </span>
                <Link
                  href="/admin/automation"
                  className="px-2 py-1 rounded text-[10px] font-medium bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors"
                >
                  Configurar
                </Link>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-text-muted">Nenhum candidato qualificado para este slot.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {candidates.map((candidate, index) => (
                  <CandidateCard
                    key={candidate.offer.id}
                    candidate={candidate}
                    rank={index + 1}
                    slotColor={config.color}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {totalCandidates === 0 && (
        <div className="card p-12 text-center">
          <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-surface-300" />
          <p className="text-text-muted text-sm">
            Nenhum candidato de merchandising disponivel.
          </p>
          <p className="text-text-muted text-xs mt-1">
            Importe produtos e ofertas para gerar candidatos automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Candidate Card ─────────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  rank,
  slotColor,
}: {
  candidate: MerchandisingCandidate;
  rank: number;
  slotColor: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-surface-50 rounded-lg group hover:bg-surface-100 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Rank */}
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
          rank <= 3 ? "bg-accent-blue/10 text-accent-blue" : "bg-surface-200 text-text-muted"
        }`}>
          {rank}
        </span>

        {/* Product image */}
        {candidate.product.imageUrl ? (
          <img
            src={candidate.product.imageUrl}
            alt=""
            className="w-10 h-10 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-surface-200 flex items-center justify-center flex-shrink-0">
            <Image className="h-4 w-4 text-surface-400" />
          </div>
        )}

        {/* Product info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-primary truncate">{candidate.product.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-text-muted flex-wrap">
            <span className="font-medium text-text-primary">
              R$ {candidate.offer.currentPrice.toFixed(2).replace(".", ",")}
            </span>
            {candidate.offer.discount > 0 && (
              <span className="text-accent-green font-medium">-{candidate.offer.discount}%</span>
            )}
            <span className="text-surface-300">|</span>
            <span>{candidate.offer.sourceSlug}</span>
            {candidate.product.categorySlug && (
              <>
                <span className="text-surface-300">|</span>
                <span>{candidate.product.categorySlug}</span>
              </>
            )}
          </div>

          {/* Reason badges */}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {candidate.reasons.map((reason) => {
              const ReasonIcon = REASON_ICONS[reason] ?? Star;
              return (
                <span
                  key={reason}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface-100 text-text-muted"
                >
                  <ReasonIcon className="h-2.5 w-2.5" />
                  {reason}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Score + Action */}
      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <div className="text-right">
          <span className={`text-sm font-bold ${slotColor}`}>
            {candidate.score.toFixed(1)}
          </span>
          <p className="text-[9px] text-text-muted">score</p>
        </div>
        <Link
          href={`/produto/${candidate.product.slug}`}
          className="px-2 py-1 rounded text-[10px] font-medium bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors opacity-0 group-hover:opacity-100"
        >
          Aplicar
        </Link>
      </div>
    </div>
  );
}
