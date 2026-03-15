/**
 * PromoSnap Logo Icon — purple price tag with white lightning bolt
 * Inline SVG for crisp rendering at any size, no external assets needed.
 */
interface LogoIconProps {
  size?: number;
  className?: string;
}

export default function LogoIcon({ size = 32, className = "" }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tagGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      {/* Price tag shape — rotated rectangle with clipped corner + hole */}
      <path
        d="M36.5 2.5L61.5 27.5V56C61.5 58.5 59.5 60.5 57 60.5H7C4.5 60.5 2.5 58.5 2.5 56V8C2.5 5.5 4.5 2.5 7 2.5H36.5Z"
        fill="url(#tagGrad)"
      />
      {/* Tag hole */}
      <circle cx="46" cy="14" r="4.5" fill="white" fillOpacity="0.9" />
      {/* Lightning bolt */}
      <path
        d="M28 16L18 34H29L24 48L42 28H31L36 16H28Z"
        fill="white"
      />
    </svg>
  );
}
