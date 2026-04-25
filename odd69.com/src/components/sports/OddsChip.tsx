'use client';

// ─────────────────────────────────────────────────────────────
// OddsChip — pressable odds pill with amber flash on click
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

interface OddsChipProps {
  label: string;
  value: string;
  onClick?: () => void;
}

export default function OddsChip({ label, value, onClick }: OddsChipProps) {
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 300);
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-between rounded-lg border px-3 min-h-[44px] transition-all active:scale-95 cursor-pointer ${
        pressed
          ? 'border-[var(--gold-line)] bg-[var(--gold-soft)] shadow-[0_0_14px_var(--gold-halo)] ring-1 ring-[var(--gold)]/40'
          : 'border-[var(--line-default)] bg-white/[0.04] hover:border-[var(--gold-line)] hover:bg-[var(--gold-soft)]'
      }`}
    >
      <span className="text-[11px] text-[var(--ink-faint)] font-semibold uppercase tracking-wide">{label}</span>
      <span className={`num text-[14px] font-black transition-colors ${pressed ? 'text-[var(--gold-bright)]' : 'text-[var(--ink-strong)]'}`}>
        {value}
      </span>
    </button>
  );
}
