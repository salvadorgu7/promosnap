"use client";

import { useState } from "react";
import { Link2, Check, MessageCircle, Send } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title: string;
  price: string;
  discount?: number;
}

export default function ShareButtons({ url, title, price, discount }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  const shareText = `${title} por ${price}${discount ? ` (-${discount}%)` : ""} - Achei no PromoSnap!\n${url}`;
  const encodedText = encodeURIComponent(shareText);

  const whatsappUrl = `https://wa.me/?text=${encodedText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${title} por ${price}${discount ? ` (-${discount}%)` : ""} - Achei no PromoSnap!`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} por ${price}${discount ? ` (-${discount}%)` : ""} - Achei no PromoSnap!`)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
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
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
      >
        <Send className="h-4 w-4" />
        Telegram
      </a>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
      >
        <span className="font-bold text-sm">𝕏</span>
        Twitter
      </a>
    </div>
  );
}
