"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { casinoService } from "@/services/casino";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

export interface SlideData {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    badge: string;
    tag: string;
    imageUrl: string;
    mobileImageUrl: string;
    charImage: string;
    gradient: string;
    overlayOpacity: number;
    overlayGradient: string;
    textColor: string;
    textAlign: "left" | "center" | "right";
    ctaText: string;
    ctaLink: string;
    ctaStyle: string;
    gameCode: string;
    gameProvider: string;
    ctaSecondaryText: string;
    ctaSecondaryLink: string;
    isActive: boolean;
    order: number;
}

export interface SliderConfig {
    heightDesktop: number;
    heightMobile: number;
    autoplay: boolean;
    autoplayInterval: number;
    transitionEffect: "fade" | "slide";
    borderRadius: number;
    slides: SlideData[];
}

// ─── CTA style map (odd69 amber palette) ──────────────────────────────────────
const CTA_STYLES: Record<string, string> = {
    gold:    "bg-amber-500 hover:bg-amber-400 text-[#06080c] font-black shadow-lg shadow-amber-500/30",
    outline: "bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#06080c] font-bold",
    ghost:   "bg-white/[0.08] hover:bg-white/[0.16] text-white font-bold backdrop-blur-md border border-white/[0.12]",
    danger:  "bg-amber-500 hover:bg-amber-400 text-[#06080c] font-bold shadow-lg shadow-amber-500/30",
    success: "bg-amber-500 hover:bg-amber-400 text-[#06080c] font-bold",
};
const getCtaClass = (style: string) => CTA_STYLES[style] ?? CTA_STYLES.gold;

// ─── Single Slide ─────────────────────────────────────────────────────────────
interface SlideProps {
    slide: SlideData;
    isFirst: boolean;
    onGameLaunch?: (gameCode: string, gameProvider: string) => void;
    launchingId?: string | null;
}

function Slide({ slide, isFirst, onGameLaunch, launchingId }: SlideProps) {
    const contentAlign =
        slide.textAlign === "center" ? "text-center" :
        slide.textAlign === "right"  ? "text-right"  : "text-left";
    const flexAlign =
        slide.textAlign === "center" ? "items-center" :
        slide.textAlign === "right"  ? "items-end"    : "items-start";
    const ctaJustify =
        slide.textAlign === "center" ? "justify-center" :
        slide.textAlign === "right"  ? "justify-end"    : "";

    const overlayAlpha = Math.round((slide.overlayOpacity ?? 40) * 2.55);
    const overlayColor = `#000000${overlayAlpha.toString(16).padStart(2, "0")}`;

    const isLaunching = launchingId === slide.id;
    const hasGameLaunch = !!(slide.gameCode && slide.gameProvider && onGameLaunch);

    return (
        <div
            className="relative shrink-0 w-full h-full snap-start snap-always overflow-hidden"
            style={{ background: slide.gradient || "linear-gradient(135deg,#0f0f0f,#1a1a1a)" }}
        >
            {/* BG images */}
            {slide.imageUrl && (
                <>
                    <img
                        src={slide.mobileImageUrl || slide.imageUrl}
                        alt=""
                        aria-hidden
                        loading={isFirst ? 'eager' : 'lazy'}
                        {...(isFirst ? { fetchPriority: 'high' as const } : {})}
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover md:hidden"
                    />
                    <img
                        src={slide.imageUrl}
                        alt=""
                        aria-hidden
                        loading={isFirst ? 'eager' : 'lazy'}
                        {...(isFirst ? { fetchPriority: 'high' as const } : {})}
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover hidden md:block"
                    />
                </>
            )}

            {/* Dark overlay */}
            {slide.overlayOpacity > 0 && (
                <div className="absolute inset-0" style={{ backgroundColor: overlayColor }} />
            )}

            {/* Directional readability gradient */}
            {slide.overlayGradient && (
                <div className="absolute inset-0" style={{ background: slide.overlayGradient }} />
            )}

            {/* Character / mascot image */}
            {slide.charImage && (
                <div className="absolute right-0 bottom-0 top-0 w-1/2 z-10 pointer-events-none">
                    <img
                        src={slide.charImage}
                        alt=""
                        aria-hidden
                        loading={isFirst ? 'eager' : 'lazy'}
                        {...(isFirst ? { fetchPriority: 'high' as const } : {})}
                        decoding="async"
                        className="h-full w-full object-contain object-right-bottom"
                    />
                </div>
            )}

            {/* Content */}
            <div
                className={`relative z-20 h-full flex flex-col justify-center px-5 md:px-14 lg:px-20 ${flexAlign} ${contentAlign}`}
                style={{ color: slide.textColor || "#ffffff" }}
            >
                <div className="max-w-xl w-full">
                    {/* Amber tag pill */}
                    {slide.tag && (
                        <span className="inline-block py-0.5 px-3 rounded-full bg-amber-500/90 text-[#06080c] text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 shadow shadow-amber-500/30">
                            {slide.tag}
                        </span>
                    )}

                    {/* Eyebrow badge */}
                    {slide.badge && (
                        <span className="inline-block bg-white/[0.08] backdrop-blur-md border border-white/[0.12] text-[10px] md:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full mb-2">
                            {slide.badge}
                        </span>
                    )}

                    {/* Title */}
                    {slide.title && (
                        <h2
                            className="font-black leading-tight drop-shadow-xl mb-1 md:mb-2"
                            style={{ fontSize: "clamp(1.3rem, 5vw, 3.5rem)", textShadow: "0 2px 24px rgba(0,0,0,0.7)" }}
                        >
                            {slide.title}
                        </h2>
                    )}

                    {/* Subtitle */}
                    {slide.subtitle && (
                        <p className="text-sm md:text-base font-semibold opacity-80 mb-1 leading-snug drop-shadow">
                            {slide.subtitle}
                        </p>
                    )}

                    {/* Description */}
                    {slide.description && (
                        <p className="text-xs md:text-sm opacity-70 mb-3 md:mb-4 max-w-md leading-relaxed drop-shadow">
                            {slide.description}
                        </p>
                    )}

                    {/* CTAs */}
                    {(slide.ctaText || slide.ctaSecondaryText) && (
                        <div className={`flex flex-wrap gap-2 md:gap-3 mt-3 md:mt-4 ${ctaJustify}`}>
                            {slide.ctaText && (
                                hasGameLaunch ? (
                                    <button
                                        type="button"
                                        disabled={isLaunching}
                                        onClick={() => onGameLaunch!(slide.gameCode, slide.gameProvider)}
                                        className={`inline-flex items-center gap-2 px-5 md:px-6 py-2.5 rounded-xl text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none ${getCtaClass(slide.ctaStyle)}`}
                                    >
                                        {isLaunching ? (
                                            <><Loader2 size={14} className="animate-spin" /> Launching…</>
                                        ) : (
                                            slide.ctaText
                                        )}
                                    </button>
                                ) : (
                                    <Link
                                        href={slide.ctaLink || "/"}
                                        className={`inline-flex items-center gap-2 px-5 md:px-6 py-2.5 rounded-xl text-sm transition-all hover:scale-105 active:scale-95 ${getCtaClass(slide.ctaStyle)}`}
                                    >
                                        {slide.ctaText}
                                    </Link>
                                )
                            )}
                            {slide.ctaSecondaryText && (
                                <Link
                                    href={slide.ctaSecondaryLink || "/"}
                                    className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 rounded-xl text-sm font-bold bg-white/[0.08] hover:bg-white/[0.16] backdrop-blur-md transition-all hover:scale-105 active:scale-95 border border-white/[0.12]"
                                    style={{ color: slide.textColor || "#ffffff" }}
                                >
                                    {slide.ctaSecondaryText}
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── DynamicHeroSlider ────────────────────────────────────────────────────────
interface DynamicHeroSliderProps {
    page: "HOME" | "CASINO" | "SPORTS";
    fallback?: React.ReactNode;
    className?: string;
    onGameLaunch?: (game: { id: string; name: string; provider: string; url: string }) => void;
    initialConfig?: SliderConfig | null;
}

export default function DynamicHeroSlider({
    page,
    fallback,
    className = "",
    onGameLaunch,
    initialConfig,
}: DynamicHeroSliderProps) {
    const { user }      = useAuth();
    const { openLogin } = useModal();

    const normalizedInitial = initialConfig && initialConfig.slides?.length
        ? initialConfig
        : null;
    const [config, setConfig]       = useState<SliderConfig | null>(normalizedInitial);
    const [current, setCurrent]     = useState(0);
    const [loading, setLoading]     = useState(!normalizedInitial);
    const [launchingId, setLaunchingId] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    /* ─── Fetch config ─── */
    useEffect(() => {
        if (normalizedInitial) return;
        fetch(`/api/page-sliders?page=${page}`)
            .then((r) => r.json())
            .then(({ slider }) => {
                if (slider?.slides?.length) {
                    const active = [...slider.slides]
                        .filter((s: SlideData) => s.isActive)
                        .sort((a: SlideData, b: SlideData) => a.order - b.order);
                    if (active.length) setConfig({ ...slider, slides: active });
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [page, normalizedInitial]);

    /* ─── Scroll to slide on current change ─── */
    const scrollToIndex = useCallback((idx: number) => {
        const el = scrollRef.current;
        if (!el) return;
        const slideWidth = el.clientWidth;
        el.scrollTo({ left: slideWidth * idx, behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToIndex(current);
    }, [current, scrollToIndex]);

    /* ─── Autoplay ─── */
    const startTimer = useCallback((cfg: SliderConfig) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!cfg.autoplay || cfg.slides.length <= 1) return;
        timerRef.current = setInterval(
            () => setCurrent((c) => (c + 1) % cfg.slides.length),
            Math.max(1000, cfg.autoplayInterval || 5000),
        );
    }, []);

    useEffect(() => {
        if (!config) return;
        startTimer(config);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [config, startTimer]);

    /* ─── Sync current with manual swipe ─── */
    const onScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const idx = Math.round(el.scrollLeft / el.clientWidth);
        if (idx !== current) setCurrent(idx);
    }, [current]);

    const goTo = (idx: number) => { setCurrent(idx); if (config) startTimer(config); };
    const prev = () => { if (config) goTo((current - 1 + config.slides.length) % config.slides.length); };
    const next = () => { if (config) goTo((current + 1) % config.slides.length); };

    /* ─── Game launch handler ─── */
    const handleGameLaunch = async (gameCode: string, gameProvider: string) => {
        if (!user) { openLogin(); return; }
        const slide = config?.slides[current];
        if (!slide) return;

        setLaunchingId(slide.id);
        try {
            const res = await casinoService.launchGame({
                username: user.username,
                provider: gameProvider,
                gameId: gameCode,
                isLobby: false,
            });
            if (res?.url) {
                onGameLaunch?.({
                    id: gameCode,
                    name: slide.title || gameCode,
                    provider: gameProvider,
                    url: res.url,
                });
            }
        } catch (err) {
            console.error("[DynamicHeroSlider] game launch failed:", err);
        } finally {
            setLaunchingId(null);
        }
    };

    /* ─── Loading shimmer ─── */
    if (loading) {
        return (
            <div
                className={`w-full overflow-hidden bg-white/[0.03] animate-pulse rounded-2xl h-[212px] md:h-[252px] ${className}`}
            />
        );
    }

    /* ─── No config → fallback ─── */
    if (!config || config.slides.length === 0) {
        return fallback ? <>{fallback}</> : null;
    }

    const br = config.borderRadius ?? 16;

    return (
        <div
            className={`group relative w-full overflow-hidden shrink-0 h-[212px] md:h-[252px] ${className}`}
            style={{ borderRadius: br }}
        >
            {/* Native scroll-snap slider */}
            <div
                ref={scrollRef}
                onScroll={onScroll}
                className="flex overflow-x-auto snap-x snap-mandatory h-full w-full no-scrollbar scroll-smooth"
                style={{ scrollbarWidth: 'none' }}
            >
                {config.slides.map((slide, i) => (
                    <Slide
                        key={slide.id}
                        slide={slide}
                        isFirst={i === 0}
                        onGameLaunch={handleGameLaunch}
                        launchingId={launchingId}
                    />
                ))}
            </div>

            {/* Prev / Next arrows */}
            {config.slides.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={prev}
                        aria-label="Previous slide"
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-30 size-9 md:size-11 bg-black/50 hover:bg-black/80 border border-white/[0.08] rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all md:opacity-0 md:group-hover:opacity-100 hover:scale-110"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={next}
                        aria-label="Next slide"
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-30 size-9 md:size-11 bg-black/50 hover:bg-black/80 border border-white/[0.08] rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all md:opacity-0 md:group-hover:opacity-100 hover:scale-110"
                    >
                        <ChevronRight size={20} />
                    </button>
                </>
            )}

            {/* Dot indicators (amber) */}
            {config.slides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
                    {config.slides.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => goTo(i)}
                            aria-label={`Go to slide ${i + 1}`}
                            className={`rounded-full transition-all duration-300 ${
                                i === current
                                    ? "bg-amber-500 w-7 h-2"
                                    : "bg-white/30 hover:bg-white/60 w-2 h-2"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
