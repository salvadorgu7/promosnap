"use client";

import { ArrowRight, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export interface CommunityChannel {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  borderColor: string;
  memberCount: string;
  href: string | null;
  ctaLabel: string;
  status: "active" | "coming-soon";
}

interface CommunityCardProps {
  channel: CommunityChannel;
}

export default function CommunityCard({ channel }: CommunityCardProps) {
  const Icon = channel.icon;
  const isConfigured = channel.status === "active" && !!channel.href;

  return (
    <div
      className={`card p-5 flex flex-col border ${channel.borderColor} hover:-translate-y-1 transition-all duration-200`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-11 h-11 rounded-xl ${channel.bg} flex items-center justify-center`}
        >
          <Icon className={`w-5 h-5 ${channel.color}`} />
        </div>
        <div className="flex items-center gap-1">
          {channel.status === "active" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-green/10 text-accent-green border border-accent-green/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              Ativo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-100 text-surface-500 border border-surface-200">
              Em breve
            </span>
          )}
        </div>
      </div>

      <h3 className="font-display font-bold text-text-primary mb-1">
        {channel.name}
      </h3>
      <p className="text-xs text-text-muted leading-relaxed mb-3 flex-1">
        {channel.description}
      </p>

      <div className="flex items-center justify-between mt-auto">
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <Users className="w-3 h-3" />
          {channel.memberCount}
        </span>
        {isConfigured ? (
          <a
            href={channel.href!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-accent-blue hover:text-brand-500 transition-colors"
          >
            {channel.ctaLabel}
            <ArrowRight className="w-3 h-3" />
          </a>
        ) : (
          <Link
            href="/canais"
            className="flex items-center gap-1 text-xs font-semibold text-accent-blue hover:text-brand-500 transition-colors"
          >
            {channel.ctaLabel}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
