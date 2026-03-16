"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";

// Common misspellings → corrections for PT-BR product searches
const CORRECTIONS: Record<string, string> = {
  "iphon": "iphone",
  "ipone": "iphone",
  "ifone": "iphone",
  "samsug": "samsung",
  "samung": "samsung",
  "samsumg": "samsung",
  "galayx": "galaxy",
  "galxy": "galaxy",
  "notbook": "notebook",
  "notebbok": "notebook",
  "notebok": "notebook",
  "noteboo": "notebook",
  "playstaton": "playstation",
  "playstaion": "playstation",
  "plastation": "playstation",
  "airfryer": "air fryer",
  "air frier": "air fryer",
  "airfrier": "air fryer",
  "bluetooh": "bluetooth",
  "bluetoth": "bluetooth",
  "blutooth": "bluetooth",
  "fone bluetoth": "fone bluetooth",
  "fone blutooth": "fone bluetooth",
  "xiaome": "xiaomi",
  "xiami": "xiaomi",
  "xaomi": "xiaomi",
  "motorolla": "motorola",
  "motorla": "motorola",
  "aspiradro": "aspirador",
  "aspirdor": "aspirador",
  "cafeteria": "cafeteira",
  "televisao": "smart tv",
  "televisão": "smart tv",
  "relogio": "smartwatch",
  "relógio": "smartwatch",
  "celulr": "celular",
  "celualr": "celular",
  "tensi": "tenis",
  "teniss": "tenis",
  "monitro": "monitor",
  "monotor": "monitor",
};

function findSuggestion(query: string): string | null {
  const q = query.toLowerCase().trim();

  // Direct match
  if (CORRECTIONS[q]) return CORRECTIONS[q];

  // Check if any correction key is a substring
  for (const [typo, correction] of Object.entries(CORRECTIONS)) {
    if (q.includes(typo)) {
      return q.replace(typo, correction);
    }
  }

  return null;
}

export default function SpellSuggestion({ query }: { query: string }) {
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    setSuggestion(findSuggestion(query));
  }, [query]);

  if (!suggestion || suggestion.toLowerCase() === query.toLowerCase()) return null;

  return (
    <div className="mt-4 p-3 rounded-xl bg-accent-blue/5 border border-accent-blue/15 flex items-center gap-3">
      <Lightbulb className="w-4 h-4 text-accent-blue flex-shrink-0" />
      <p className="text-sm text-text-secondary">
        Quis dizer{" "}
        <Link
          href={`/busca?q=${encodeURIComponent(suggestion)}`}
          className="font-semibold text-accent-blue hover:underline"
        >
          &ldquo;{suggestion}&rdquo;
        </Link>
        ?
      </p>
    </div>
  );
}
