"use client";

import { useState } from "react";
import { Clipboard, Check } from "lucide-react";

export default function CouponCopy({ code, onCopied }: { code: string; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                 bg-accent-blue/10 border border-accent-blue/20 text-accent-blue
                 text-sm font-mono font-semibold hover:bg-accent-blue/20 transition-all"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-accent-green" />
          <span className="text-accent-green">Copiado!</span>
        </>
      ) : (
        <>
          <Clipboard className="w-3.5 h-3.5" />
          {code}
        </>
      )}
    </button>
  );
}
