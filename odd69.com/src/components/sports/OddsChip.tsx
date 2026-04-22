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
      className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 transition-all active:scale-95 cursor-pointer ${
        pressed
          ? 'border-amber-500/40 bg-amber-500/20 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
          : 'border-white/[0.08] bg-white/[0.04] hover:border-amber-500/30 hover:bg-amber-500/10'
      }`}
    >
      <span className="text-[11px] text-white/50">{label}</span>
      <span className={`text-[13px] font-black transition-colors ${pressed ? 'text-amber-300' : 'text-white/80'}`}>
        {value}
      </span>
    </button>
  );
}
