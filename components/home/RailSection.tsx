"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface RailSectionProps {
  title: string;
  subtitle?: string;
  href?: string;
  icon?: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}

export default function RailSection({ title, subtitle, href, icon, count, children }: RailSectionProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = railRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = railRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = railRef.current;
    if (el) {
      const amount = dir === "left" ? -300 : 300;
      el.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <section className="py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Gradient line */}
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-accent-blue to-accent-purple hidden sm:block" />
            <div className="flex items-center gap-2">
              {icon}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-lg text-surface-900">{title}</h2>
                  {count !== undefined && count > 0 && (
                    <span className="text-xs text-surface-400 font-medium">({count} ofertas)</span>
                  )}
                </div>
                {subtitle && <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Scroll arrows - desktop only */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => scroll("left")}
                className={`w-8 h-8 rounded-full border border-surface-200 flex items-center justify-center transition-all ${
                  canScrollLeft ? "text-surface-600 hover:bg-surface-100" : "text-surface-300 cursor-default"
                }`}
                disabled={!canScrollLeft}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll("right")}
                className={`w-8 h-8 rounded-full border border-surface-200 flex items-center justify-center transition-all ${
                  canScrollRight ? "text-surface-600 hover:bg-surface-100" : "text-surface-300 cursor-default"
                }`}
                disabled={!canScrollRight}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {href && (
              <Link href={href} className="flex items-center gap-1 text-sm text-accent-blue hover:text-accent-purple transition-colors font-medium">
                Ver tudo <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
        <div ref={railRef} className="rail">{children}</div>
      </div>
    </section>
  );
}
