import LogoIcon from "./LogoIcon";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 24, text: "text-base", gap: "gap-1.5" },
  md: { icon: 32, text: "text-lg md:text-xl", gap: "gap-2" },
  lg: { icon: 40, text: "text-2xl", gap: "gap-2.5" },
} as const;

export default function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const s = SIZES[size];

  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <LogoIcon size={s.icon} className="flex-shrink-0" />
      {showText && (
        <span className={`font-display font-extrabold ${s.text} tracking-tight text-surface-900`}>
          Promo<span className="text-gradient">Snap</span>
        </span>
      )}
    </span>
  );
}
