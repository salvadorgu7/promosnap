import { Truck, Zap, Package } from "lucide-react";
import type { ShippingBadgeType } from "@/lib/shipping/types";

interface Props {
  freeShipping?: boolean;
  fastDelivery?: boolean;
  fulfillmentFull?: boolean;
  /** Compact mode for card views */
  compact?: boolean;
}

interface BadgeInfo {
  type: ShippingBadgeType;
  label: string;
  shortLabel: string;
  icon: typeof Truck;
  color: string;
}

const BADGES: BadgeInfo[] = [
  {
    type: "free-shipping",
    label: "Frete Gratis",
    shortLabel: "Gratis",
    icon: Truck,
    color: "text-green-700 bg-green-50 border-green-200",
  },
  {
    type: "fast-delivery",
    label: "Entrega Rapida",
    shortLabel: "Rapido",
    icon: Zap,
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    type: "full-fulfillment",
    label: "Envio Full",
    shortLabel: "Full",
    icon: Package,
    color: "text-purple-700 bg-purple-50 border-purple-200",
  },
];

export default function ShippingBadge({
  freeShipping,
  fastDelivery,
  fulfillmentFull,
  compact = false,
}: Props) {
  const activeBadges: BadgeInfo[] = [];

  if (freeShipping) activeBadges.push(BADGES[0]);
  if (fastDelivery) activeBadges.push(BADGES[1]);
  if (fulfillmentFull) activeBadges.push(BADGES[2]);

  if (activeBadges.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {activeBadges.map((badge) => {
          const Icon = badge.icon;
          return (
            <span
              key={badge.type}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium border ${badge.color}`}
              title={badge.label}
            >
              <Icon className="h-2.5 w-2.5" />
              {badge.shortLabel}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {activeBadges.map((badge) => {
        const Icon = badge.icon;
        return (
          <span
            key={badge.type}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-medium ${badge.color}`}
          >
            <Icon className="h-3 w-3" />
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}
