"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Activity, Trophy, Calendar, Clock, ChevronRight,
  Loader2, Search, X, Star,
} from "lucide-react";
import { MdSportsCricket, MdSportsBasketball } from "react-icons/md";
import { IoFootball, IoTennisball, IoBaseball, IoTrophy } from "react-icons/io5";
import { GiBaseballBat } from "react-icons/gi";
import { HiStatusOnline } from "react-icons/hi";
import { BsCalendar3 } from "react-icons/bs";
import { sportsApi, Event } from "@/services/sports";

/* ═══ SPORT TABS ═══ */
const SPORTS = [
  { id: null, label: "All Sports", icon: IoTrophy },
  { id: "4", label: "Cricket", icon: MdSportsCricket },
  { id: "1", label: "Football", icon: IoFootball },
  { id: "2", label: "Tennis", icon: IoTennisball },
  { id: "7522", label: "Basketball", icon: MdSportsBasketball },
  { id: "7511", label: "Baseball", icon: IoBaseball },
];

/* ═══ HELPERS ═══ */
const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return `Today, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    const tom = new Date(now); tom.setDate(tom.getDate() + 1);
    if (d.toDateString() === tom.toDateString()) return `Tomorrow, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
};

const getTeamInitials = (name?: string) => (name || "??").substring(0, 3).toUpperCase();

const isEventLive = (e: Event) =>
  e.match_status === "In Play" || e.match_status === "Live" || !!(e as any).in_play;

const getQuickOdds = (e: Event): { name: string; back: number | null; lay?: number | null }[] => {
  const mo = e.match_odds;
  if (mo && mo.length >= 1) {
    return mo.slice(0, 3).map((o) => ({ name: o.name?.slice(0, 14) || "?", back: o.back ?? null, lay: o.lay ?? null }));
  }
  const market = (e.markets || []).find((m) => m.market_name?.toLowerCase().includes("match") || m.market_name?.toLowerCase().includes("winner"));
  if (!market) return [];
  const runners = market.runners_data || market.marketOdds || [];
  return runners.slice(0, 3).map((r: any) => {
    const backOdd = Array.isArray(r.odds) ? r.odds.find((o: any) => o.otype === "back") : null;
    const layOdd = Array.isArray(r.odds) ? r.odds.find((o: any) => o.otype === "lay") : null;
    return { name: (r.nat || "?").slice(0, 14), back: backOdd?.odds ?? null, lay: layOdd?.odds ?? null };
  });
};

/* ═══ EVENT CARD ═══ */
function EventCard({ event, teamIcons, forceLive }: { event: Event; teamIcons: Record<string, string>; forceLive?: boolean }) {
  const live = forceLive || isEventLive(event);
  const parts = event.event_name?.split(" v ") || [];
  const home = event.home_team || parts[0] || "Team A";
  const away = event.away_team || parts[1] || "Team B";
  const league = event.competition_name || event.competition?.competition_name || "";
  const odds = getQuickOdds(event);
  const homeIcon = teamIcons[home.toLowerCase().trim()];
  const awayIcon = teamIcons[away.toLowerCase().trim()];
  const hasScore = live && (event.score1 || event.score2);

  return (
    <Link href={`/sports/match/${event.event_id}`} className="block group">
      <div className={`rounded-xl border transition-all duration-200 overflow-hidden
        ${live
          ? "bg-gradient-to-br from-[#0f1a13] to-[#0a0c10] border-emerald-900/40 hover:border-emerald-700/40"
          : "bg-white/[0.012] border-white/[0.04] hover:border-white/[0.09] hover:bg-white/[0.02]"}`}>

        {/* Top bar — league + status */}
        <div className={`flex items-center justify-between px-3 py-1.5 ${live ? "bg-emerald-500/[0.04] border-b border-emerald-900/25" : "border-b border-white/[0.03]"}`}>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {live ? (
              <span className="flex items-center gap-1 text-[7px] font-black text-emerald-400 uppercase tracking-wider flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[7px] font-bold text-white/15 uppercase tracking-wider flex-shrink-0">
                <Calendar size={8} /> Upcoming
              </span>
            )}
            <span className="w-px h-2.5 bg-white/[0.06] mx-0.5" />
            <span className="text-[9px] font-semibold text-white/20 truncate">{league}</span>
          </div>
          <span className="text-[8px] text-white/10 flex-shrink-0">{formatDate(event.open_date)}</span>
        </div>

        {/* Teams + Score */}
        <div className="px-3 py-2.5 space-y-1.5">
          {/* Home */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-black flex-shrink-0 ${live ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-white/20"}`}>
                {homeIcon ? <img src={homeIcon} alt={home} className="w-full h-full object-contain rounded p-0.5" /> : home.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-[12px] font-bold text-white/70 truncate">{home}</span>
            </div>
            {hasScore && <span className="text-[13px] font-black text-[#f59e0b] font-mono">{event.score1 || "0"}</span>}
          </div>

          {/* Away */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-black flex-shrink-0 ${live ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-white/20"}`}>
                {awayIcon ? <img src={awayIcon} alt={away} className="w-full h-full object-contain rounded p-0.5" /> : away.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-[12px] font-bold text-white/70 truncate">{away}</span>
            </div>
            {hasScore && <span className="text-[13px] font-black text-[#f59e0b] font-mono">{event.score2 || "0"}</span>}
          </div>
        </div>

        {/* Odds row */}
        {odds.length > 0 && (
          <div className="flex gap-1 px-2.5 pb-2.5">
            {odds.map((o, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="block text-[7px] font-bold text-white/15 uppercase truncate mb-0.5">{o.name}</span>
                <div className="flex gap-0.5">
                  <div className="flex-1 py-1 rounded-md text-[11px] font-black text-center" style={{ backgroundColor: "rgba(114,187,239,0.12)", color: o.back ? "#72BBEF" : "rgba(255,255,255,0.1)" }}>
                    {o.back ?? "-"}
                  </div>
                  {o.lay != null && (
                    <div className="flex-1 py-1 rounded-md text-[11px] font-black text-center" style={{ backgroundColor: "rgba(250,169,186,0.12)", color: o.lay ? "#FAA9BA" : "rgba(255,255,255,0.1)" }}>
                      {o.lay ?? "-"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ═══ MAIN CONTENT ═══ */
function SportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSportId = searchParams.get("sport_id");

  const [selectedSport, setSelectedSport] = useState<string | null>(urlSportId || null);
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [teamIcons, setTeamIcons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"live" | "upcoming" | "all">("all");

  useEffect(() => { if (urlSportId !== selectedSport) setSelectedSport(urlSportId || null); }, [urlSportId]);

  /* Client-side sport filter fallback (in case backend ignores sportId param) */
  const filterBySport = (events: Event[], sportId: string | null) => {
    if (!sportId) return events;
    return events.filter((e) => {
      const eSportId = String((e as any).sport_id || e.competition?.sport?.sport_id || "");
      return eSportId === sportId;
    });
  };

  /* Fetch events */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [live, upcoming] = await Promise.all([
          sportsApi.getLiveEvents(selectedSport || undefined),
          sportsApi.getUpcomingEvents(selectedSport || undefined),
        ]);
        // Apply client-side sport filter as safety net
        setLiveEvents(filterBySport(live || [], selectedSport));
        setUpcomingEvents(filterBySport(upcoming || [], selectedSport));
      } catch { setLiveEvents([]); setUpcomingEvents([]); }
      finally { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [selectedSport]);

  /* Fetch team icons once */
  useEffect(() => { sportsApi.getTeamIcons().then(setTeamIcons).catch(() => {}); }, []);

  const handleSportChange = (id: string | null) => {
    setSelectedSport(id);
    const params = new URLSearchParams();
    if (id) params.set("sport_id", id);
    router.replace(params.toString() ? `/sports?${params.toString()}` : "/sports", { scroll: false });
  };

  /* Filter */
  const filterEvents = (events: Event[]) =>
    search ? events.filter((e) => e.event_name?.toLowerCase().includes(search.toLowerCase())) : events;

  const filteredLive = filterEvents(liveEvents);
  const filteredUpcoming = filterEvents(upcomingEvents);
  const showLive = view === "all" || view === "live";
  const showUpcoming = view === "all" || view === "upcoming";

  return (
    <div className="max-w-[1600px] mx-auto px-3 md:px-5 py-4 space-y-4">
      {/* Sport tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
        {SPORTS.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id ?? "all"} onClick={() => handleSportChange(s.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-[11px] font-bold transition-all flex-shrink-0 ${
                selectedSport === s.id
                  ? "bg-[#f59e0b]/10 border-[#f59e0b]/25 text-[#f59e0b]"
                  : "bg-white/[0.01] border-white/[0.04] text-white/25 hover:text-white/50 hover:bg-white/[0.03]"
              }`}>
              <Icon size={14} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* Search + View toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15" size={14} />
          <input
            type="text" placeholder="Search matches..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-xl py-2.5 pl-9 pr-8 outline-none text-[12px] placeholder:text-white/15 focus:border-white/[0.1] transition-colors"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20"><X size={12} /></button>}
        </div>
        <div className="flex rounded-lg border border-white/[0.04] overflow-hidden text-[9px] font-bold">
          {(["all", "live", "upcoming"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-2 flex items-center gap-1 ${view === v ? "bg-[#f59e0b]/10 text-[#f59e0b]" : "text-white/20 hover:text-white/40"} transition-colors capitalize`}>
              {v === "live" ? <><HiStatusOnline size={10} /> Live</> : v === "upcoming" ? <><BsCalendar3 size={9} /> Upcoming</> : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="text-[#f59e0b] animate-spin" />
        </div>
      )}

      {/* Live Events */}
      {!loading && showLive && filteredLive.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <h2 className="text-[13px] font-black text-white/60 uppercase tracking-wider">Live Now</h2>
            <span className="text-[9px] font-bold text-red-400/50 bg-red-500/10 px-1.5 py-0.5 rounded">{filteredLive.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredLive.map((e) => <EventCard key={e.event_id} event={e} teamIcons={teamIcons} forceLive />)}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {!loading && showUpcoming && filteredUpcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 mt-4">
            <Calendar size={12} className="text-white/15" />
            <h2 className="text-[13px] font-black text-white/60 uppercase tracking-wider">Upcoming</h2>
            <span className="text-[9px] font-bold text-white/15 bg-white/[0.03] px-1.5 py-0.5 rounded">{filteredUpcoming.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredUpcoming.map((e) => <EventCard key={e.event_id} event={e} teamIcons={teamIcons} />)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredLive.length === 0 && filteredUpcoming.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center"><MdSportsCricket size={28} className="text-white/15" /></div>
          <div className="text-center">
            <p className="text-white/50 font-bold text-sm">No matches found</p>
            <p className="text-white/15 text-xs mt-1">Try selecting a different sport or check back later</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ EXPORT ═══ */
export default function SportsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f59e0b]" /></div>}>
      <SportsContent />
    </Suspense>
  );
}
