import Image from "next/image";
import LogoIcon from "./LogoIcon";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 24, logoH: 24, logoW: 135, text: "text-base", gap: "gap-1.5" },
  md: { icon: 32, logoH: 32, logoW: 180, text: "text-lg md:text-xl", gap: "gap-2" },
  lg: { icon: 40, logoH: 40, logoW: 225, text: "text-2xl", gap: "gap-2.5" },
} as const;

export default function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const s = SIZES[size];

  if (showText) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <Image
          src="/promosnap-logo-horizontal.png"
          alt="PromoSnap"
          width={s.logoW}
          height={s.logoH}
          className="flex-shrink-0"
          priority
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <LogoIcon size={s.icon} className="flex-shrink-0" />
    </span>
  );
}
