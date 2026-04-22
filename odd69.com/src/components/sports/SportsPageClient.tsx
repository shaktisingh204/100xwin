"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import MaintenanceState from "@/components/maintenance/MaintenanceState";
import SportsMainContent from "@/components/sports/SportsMainContent";
import { useSectionMaintenance } from "@/hooks/useSectionMaintenance";
import type { SportsLobbyInitialData } from "@/lib/sportsLobbyData";

interface SportsPageClientProps {
  initialData: SportsLobbyInitialData;
  initialSelectedSport?: string | null;
}

function SportsPageContent({ initialData, initialSelectedSport = null }: SportsPageClientProps) {
  const searchParams = useSearchParams();
  const urlSportId = searchParams.get("sport_id");
  const [selectedSport, setSelectedSport] = useState<string | null>(urlSportId || initialSelectedSport || null);
  const { blocked, loading, message } = useSectionMaintenance(
    "sports",
    "Sports is currently under maintenance. Betting, match markets, and settlement are temporarily paused.",
  );

  useEffect(() => {
    setSelectedSport(urlSportId || initialSelectedSport || null);
  }, [initialSelectedSport, urlSportId]);

  const shell = (content: ReactNode) => (
    <div className="min-h-full bg-[#06080c] text-white">
      {content}
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex min-h-screen items-center justify-center bg-[#06080c]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/[0.08] border-t-amber-500" />
      </div>
    );
  }

  if (blocked) {
    return shell(
      <div className="min-h-full bg-[#06080c] pt-6">
        <MaintenanceState
          title="Sports Maintenance In Progress"
          message={message}
          backHref="/"
          backLabel="Back to Home"
        />
      </div>
    );
  }

  return shell(<SportsMainContent initialData={initialData} />);
}

export default function SportsPageClient(props: SportsPageClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#06080c]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/[0.08] border-t-amber-500" />
        </div>
      }
    >
      <SportsPageContent {...props} />
    </Suspense>
  );
}
