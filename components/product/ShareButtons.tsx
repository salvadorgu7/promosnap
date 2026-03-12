"use client";

import { useState } from "react";
import { Link2, Check, MessageCircle } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title: string;
  price: string;
}

export default function ShareButtons({ url, title, price }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappText = encodeURIComponent(`${title} por ${price} - Achei no PromoSnap!\n${url}`);
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-accent-green" />
            Copiado!
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" />
            Copiar Link
          </>
        )}
      </button>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </a>
    </div>
  );
}
