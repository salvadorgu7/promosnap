"use client";

import { getSmartCTA, type SmartCTAOpts } from "@/lib/revenue/smart-cta";

interface SmartCTAProps {
  discount?: number;
  isLowestPrice?: boolean;
  isFreeShipping?: boolean;
  offerScore?: number;
  href: string;
  context?: "card" | "product" | "comparison";
}

export default function SmartCTA({
  discount,
  isLowestPrice,
  isFreeShipping,
  offerScore,
  href,
  context,
}: SmartCTAProps) {
  const cta = getSmartCTA({ discount, isLowestPrice, isFreeShipping, offerScore, context });

  const baseClasses =
    "inline-flex flex-col items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200 w-full text-center";

  let variantClasses: string;

  switch (cta.urgency) {
    case "high":
      variantClasses =
        "bg-gradient-to-r from-accent-blue to-brand-500 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] animate-pulse";
      break;
    case "medium":
      variantClasses =
        "bg-accent-blue text-white hover:bg-accent-blue/90 shadow-md hover:shadow-lg";
      break;
    case "low":
    default:
      variantClasses =
        "border-2 border-accent-blue text-accent-blue bg-transparent hover:bg-accent-blue/5";
      break;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`${baseClasses} ${variantClasses}`}
    >
      <span>{cta.text}</span>
      {cta.subtext && (
        <span className="text-xs font-normal opacity-80 mt-0.5">
          {cta.subtext}
        </span>
      )}
    </a>
  );
}
