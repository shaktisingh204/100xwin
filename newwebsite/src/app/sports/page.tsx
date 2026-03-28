"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from "@/components/layout/Header";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import GamesRail from "@/components/layout/GamesRail";
import SportsMainContent from "@/components/sports/SportsMainContent";

function SportsContent() {
    const searchParams = useSearchParams();
    const urlSportId = searchParams.get('sport_id');
    const [selectedSport, setSelectedSport] = useState<string | null>(urlSportId || null);


    useEffect(() => {
        if (urlSportId !== selectedSport) {
            setSelectedSport(urlSportId || null);
        }
    }, [urlSportId]);

    return (
        <div className="h-screen overflow-hidden bg-bg-base font-[family-name:var(--font-poppins)] flex flex-col">
            {/* 1. Header */}
            <Header />

            <div className="flex flex-1 overflow-hidden pt-[64px]">
                {/* 2. Left Sidebar (Navigation) */}
                <LeftSidebar
                    selectedSportId={selectedSport}
                    onSelectSport={setSelectedSport}

                />

                {/* 3. Main Live Content */}
                <SportsMainContent
                    selectedSportId={selectedSport}
                    onSelectSport={setSelectedSport}
                />

                {/* 4. Right Sidebar (Bet Slip) - hidden on mobile */}
                <div className="hidden md:block">
                    <RightSidebar />
                </div>

                {/* 5. Games Rail (Far Right) */}
                <GamesRail />
            </div>
        </div>
    );
}

export default function SportsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg-base flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div></div>}>
            <SportsContent />
        </Suspense>
    );
}
