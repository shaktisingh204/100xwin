import SportsPageClient from "@/components/sports/SportsPageClient";
import { fetchSportsLobbyInitialData } from "@/lib/sportsLobbyData";

// ════════════════════════════════════════════════════════════════════════════
// /sports — thin themed wrapper
// The entire sports lobby chrome (hero, live strip, league cards, markets)
// is rendered inside <SportsPageClient> which owns its own gold-leaf theming.
// This wrapper only resolves search params + fetches initial lobby data so
// the client shell hydrates instantly.
// ════════════════════════════════════════════════════════════════════════════

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SportsPageSearchParams =
  | Promise<{ sport_id?: string | string[] }>
  | { sport_id?: string | string[] }
  | undefined;

export default async function SportsPage({
  searchParams,
}: {
  searchParams?: SportsPageSearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedSportRaw = resolvedSearchParams?.sport_id;
  const initialSelectedSport = Array.isArray(selectedSportRaw)
    ? selectedSportRaw[0] ?? null
    : selectedSportRaw ?? null;

  const initialData = await fetchSportsLobbyInitialData();

  return (
    <SportsPageClient
      initialData={initialData}
      initialSelectedSport={initialSelectedSport}
    />
  );
}
