"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PremiumHomeContent from "@/components/home/PremiumHomeContent";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar"; // Keep for mobile/betslip usage if needed

function HomeContent() {
  const searchParams = useSearchParams();
  const urlSportId = searchParams.get('sport_id');
  const [selectedSportId, setSelectedSportId] = useState<string | null>(urlSportId || null);
  const [activeTab, setActiveTab] = useState<'live' | 'line'>('live');

  useEffect(() => {
    if (urlSportId !== selectedSportId) {
      setSelectedSportId(urlSportId || null);
    }
  }, [urlSportId]);

  return (
    <div className="h-screen overflow-hidden bg-bg-base font-[family-name:var(--font-poppins)] flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden pt-[56px] md:pt-[60px] pb-[80px] md:pb-0 max-w-[1920px] mx-auto w-full">
        {/* Left Sidebar - Static */}
        <LeftSidebar
          selectedSportId={selectedSportId}
          onSelectSport={setSelectedSportId}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Main Content Area - Scrollable */}
        <main className="flex-1 min-w-0 bg-bg-base overflow-y-auto overflow-x-hidden xl:max-w-[75%] mx-auto">
          <PremiumHomeContent selectedSportId={selectedSportId} />
          <Footer />
        </main>

        {/* Global Chat / Right Sidebar - Static on desktop */}
        <div className="hidden xl:block">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-base flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div></div>}>
      <HomeContent />
    </Suspense>
  );
}
