"use client";

import { useState, useEffect } from "react";
import { X, Bell, ArrowRight } from "lucide-react";
import Link from "next/link";

interface PromoModalConfig {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  secondaryText?: string;
  secondaryUrl?: string;
}

// Static config — can be replaced with API/config endpoint later
// Disabled: modal was blocking homepage content and hurting UX.
// Re-enable by setting a config object here when ready.
const ACTIVE_MODAL: PromoModalConfig | null = null;

const SESSION_KEY = "promosnap_modal_dismissed";

export default function PromoModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ACTIVE_MODAL) return;
    // Show once per session
    const dismissed = sessionStorage.getItem(SESSION_KEY);
    if (dismissed === ACTIVE_MODAL.id) return;
    // Delay appearance for non-intrusive UX
    const timer = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    if (ACTIVE_MODAL) {
      sessionStorage.setItem(SESSION_KEY, ACTIVE_MODAL.id);
    }
    setVisible(false);
  };

  if (!ACTIVE_MODAL || !visible) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm promo-modal-backdrop"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="promo-modal-content relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Top accent */}
        <div className="h-1.5 bg-gradient-to-r from-accent-blue via-brand-500 to-accent-purple" />

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-7 pt-8">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue/10 to-brand-500/10 flex items-center justify-center mb-5">
            <Bell className="w-7 h-7 text-accent-blue" />
          </div>

          <h3 className="font-display font-extrabold text-xl text-text-primary mb-2">
            {ACTIVE_MODAL.title}
          </h3>
          <p className="text-sm text-text-muted leading-relaxed mb-6">
            {ACTIVE_MODAL.description}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href={ACTIVE_MODAL.ctaUrl}
              onClick={dismiss}
              className="btn-primary flex-1 justify-center py-2.5 text-sm"
            >
              {ACTIVE_MODAL.ctaText}
              <ArrowRight className="w-4 h-4" />
            </Link>
            {ACTIVE_MODAL.secondaryText && ACTIVE_MODAL.secondaryUrl && (
              <Link
                href={ACTIVE_MODAL.secondaryUrl}
                onClick={dismiss}
                className="text-sm text-surface-500 hover:text-accent-blue transition-colors font-medium"
              >
                {ACTIVE_MODAL.secondaryText}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
