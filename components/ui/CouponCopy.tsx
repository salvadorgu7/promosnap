"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CouponCopyProps {
  code: string;
  description?: string;
}

export default function CouponCopy({ code, description }: CouponCopyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-accent-blue/40 bg-accent-blue/5 hover:bg-accent-blue/10 transition-colors w-full"
      title={description || `Copiar cupom ${code}`}
    >
      <span className="font-mono font-bold text-accent-blue text-sm tracking-wide flex-1 text-left">
        {code}
      </span>
      {copied ? (
        <Check className="w-4 h-4 text-accent-green flex-shrink-0" />
      ) : (
        <Copy className="w-4 h-4 text-surface-400 group-hover:text-accent-blue flex-shrink-0 transition-colors" />
      )}
    </button>
  );
}
