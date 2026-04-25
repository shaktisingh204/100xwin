"use client";

import { useMemo } from "react";
import { Crown, Star, Users } from "lucide-react";

export interface FieldPlayer {
  playerId: number;
  name: string;
  role: string;
  teamId: number;
  credit?: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  image?: string;
  teamShort?: string;
  isPlaying11?: boolean;
}

export interface CricketFieldTeam {
  id: number;
  short: string;
  name?: string;
  logo?: string;
  thumb?: string;
  color?: string;
}

interface CricketFieldProps {
  players: FieldPlayer[];
  teamA?: CricketFieldTeam;
  teamB?: CricketFieldTeam;
  showCredits?: boolean;
  interactive?: boolean;
  onPlayerClick?: (p: FieldPlayer) => void;
}

const ROLE_ORDER: Array<{ key: string; label: string }> = [
  { key: "keeper", label: "Wicket-Keeper" },
  { key: "batsman", label: "Batters" },
  { key: "allrounder", label: "All-Rounders" },
  { key: "bowler", label: "Bowlers" },
];

// Team colour fallbacks pulled from theme tokens (resolved via CSS vars at use site).
const FALLBACK_TEAM_A = "var(--gold)";
const FALLBACK_TEAM_B = "var(--ice)";

export default function CricketField({
  players,
  teamA,
  teamB,
  showCredits = false,
  interactive = false,
  onPlayerClick,
}: CricketFieldProps) {
  const byRole = useMemo(
    () => ({
      keeper: players.filter((p) => p.role === "keeper"),
      batsman: players.filter((p) => p.role === "batsman"),
      allrounder: players.filter((p) => p.role === "allrounder"),
      bowler: players.filter((p) => p.role === "bowler"),
    }),
    [players],
  );

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[4/5] select-none">
      <div className="absolute inset-0 rounded-[46%] bg-gradient-to-b from-[#2a7a38] via-[#1e5c2a] to-[#0f3a18] overflow-hidden shadow-2xl shadow-black/60">
        <div className="absolute inset-[2%] rounded-[46%] border-[3px] border-[var(--ink-whisper)]" />
        <div className="absolute inset-[24%] rounded-[50%] border-2 border-[var(--ink-whisper)]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0 22px, rgba(243,241,236,0.85) 22px 23px)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.55)_100%)]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[13%] h-[44%] bg-[#c9a86b] rounded-[2px] shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-b from-[#e0bf85] via-[#c9a86b] to-[#9a7f44]" />
          <div className="absolute top-[14%] left-0 right-0 h-[2px] bg-black/70" />
          <div className="absolute bottom-[14%] left-0 right-0 h-[2px] bg-black/70" />
          <div className="absolute top-[6%] left-1/2 -translate-x-1/2 flex gap-[1px]">
            <span className="w-[2px] h-[6px] bg-[var(--ink)] rounded-sm" />
            <span className="w-[2px] h-[6px] bg-[var(--ink)] rounded-sm" />
            <span className="w-[2px] h-[6px] bg-[var(--ink)] rounded-sm" />
          </div>
          <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 flex gap-[1px]">
            <span className="w-[2px] h-[6px] bg-[var(--ink)] rounded-sm" />
            <span className="w-[2px] h-[6px] bg-[var(--ink)] rounded-sm" />
            <span className="w-[2px] h-[6px] bg-[var(--ink)] rounded-sm" />
          </div>
        </div>
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-40 h-20 bg-[var(--gold)]/15 blur-2xl rounded-full" />
      </div>

      <div className="absolute inset-0 flex flex-col justify-between px-[5%] py-[9%]">
        {ROLE_ORDER.map((r) => (
          <RoleRow
            key={r.key}
            label={r.label}
            players={byRole[r.key as keyof typeof byRole] || []}
            teamA={teamA}
            teamB={teamB}
            showCredits={showCredits}
            onPlayerClick={interactive ? onPlayerClick : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function RoleRow({
  label,
  players,
  teamA,
  teamB,
  showCredits,
  onPlayerClick,
}: {
  label: string;
  players: FieldPlayer[];
  teamA?: CricketFieldTeam;
  teamB?: CricketFieldTeam;
  showCredits?: boolean;
  onPlayerClick?: (p: FieldPlayer) => void;
}) {
  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 min-h-[58px] justify-center">
        <span className="t-eyebrow !text-[8px] !text-[var(--ink-whisper)]">
          {label}
        </span>
        <span className="num text-[9px] font-bold text-[var(--ink-faint)]">—</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="t-eyebrow !text-[8px] md:!text-[9px] !text-[var(--ink-strong)] drop-shadow">
        {label}
      </span>
      <div className="flex items-start justify-center gap-1.5 md:gap-2.5 flex-wrap w-full">
        {players.map((p) => {
          const teamShort =
            p.teamShort ||
            (p.teamId === teamA?.id ? teamA?.short : teamB?.short) ||
            "";
          const teamColor =
            p.teamId === teamA?.id
              ? teamA?.color || FALLBACK_TEAM_A
              : teamB?.color || FALLBACK_TEAM_B;
          return (
            <PlayerChip
              key={p.playerId}
              player={p}
              teamShort={teamShort}
              teamColor={teamColor}
              showCredits={showCredits}
              onClick={onPlayerClick ? () => onPlayerClick(p) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

function PlayerChip({
  player,
  teamShort,
  teamColor,
  showCredits,
  onClick,
}: {
  player: FieldPlayer;
  teamShort: string;
  teamColor: string;
  showCredits?: boolean;
  onClick?: () => void;
}) {
  const parts = player.name.trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ");
  const displayName = lastName ? `${firstName.charAt(0)}. ${lastName}` : firstName;

  const isC = !!player.isCaptain;
  const isVC = !!player.isViceCaptain;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col items-center gap-0.5 max-w-[64px] md:max-w-[72px] group"
    >
      <div className="relative">
        <div
          className="w-11 h-11 md:w-[52px] md:h-[52px] rounded-full bg-[var(--bg-base)] overflow-hidden flex items-center justify-center"
          style={{ boxShadow: `0 0 0 3px ${teamColor}, 0 4px 14px rgba(0,0,0,0.5)` }}
        >
          {player.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-[var(--ink-ghost)] to-transparent flex items-center justify-center">
              <Users size={16} className="text-[var(--ink-faint)]" />
            </div>
          )}
        </div>

        {teamShort && (
          <span
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 num text-[7px] font-extrabold text-[var(--ink)] px-1.5 py-[1px] rounded-sm tracking-wide shadow"
            style={{ background: teamColor }}
          >
            {teamShort}
          </span>
        )}

        {isC && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center gap-0.5 bg-[var(--gold)] text-[var(--bg-base)] text-[9px] font-extrabold rounded-md px-1 py-[1px] border-2 border-[var(--bg-base)] shadow-md">
            <Crown size={8} strokeWidth={3} /> <span className="num">C · 2x</span>
          </span>
        )}
        {isVC && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center gap-0.5 bg-[var(--ice)] text-[var(--bg-base)] text-[9px] font-extrabold rounded-md px-1 py-[1px] border-2 border-[var(--bg-base)] shadow-md">
            <Star size={8} strokeWidth={3} /> <span className="num">VC · 1.5x</span>
          </span>
        )}
      </div>

      <div
        className={`mt-2 rounded px-1.5 py-[2px] min-w-[52px] text-center shadow ${
          isC
            ? "bg-[var(--gold)] text-[var(--bg-base)]"
            : isVC
              ? "bg-[var(--ice)] text-[var(--bg-base)]"
              : "bg-black/70 backdrop-blur-sm text-[var(--ink)]"
        }`}
      >
        <p className="text-[9px] md:text-[10px] font-extrabold truncate leading-tight tracking-tight">
          {displayName}
        </p>
      </div>

      {showCredits && player.credit != null && (
        <span className="num mt-0.5 bg-[var(--ink)] text-[var(--bg-base)] text-[8px] font-extrabold px-1.5 py-[1px] rounded-full shadow-sm">
          {player.credit.toFixed(1)} Cr
        </span>
      )}
    </button>
  );
}
