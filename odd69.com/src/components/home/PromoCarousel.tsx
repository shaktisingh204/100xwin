"use client";

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';

interface PromoCardItem {
    _id?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    gradient?: string;
    tag?: string;
    bgImage?: string;
    charImage?: string;
    buttonText?: string;
    buttonLink?: string;
}

function gradientToCss(g?: string) {
    return g || 'linear-gradient(135deg, #7c3aed, #4c1d95)';
}

function PromoTile({ card }: { card: PromoCardItem }) {
    return (
        <Link
            href={card.buttonLink || '/promotions'}
            className="relative block rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.15] transition-all hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] group min-h-[160px]"
            style={{ background: gradientToCss(card.gradient) }}
        >
            {card.bgImage && (
                <img
                    src={card.bgImage}
                    alt={card.title || ''}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
                />
            )}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/[0.06] pointer-events-none" />
            <div className="relative z-10 p-5 flex flex-col gap-1 max-w-[65%]">
                {card.tag && (
                    <span className="self-start bg-black/30 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md mb-1">
                        {card.tag}
                    </span>
                )}
                {card.title && (
                    <p className="text-white font-black text-base leading-tight">{card.title}</p>
                )}
                {card.subtitle && (
                    <p className="text-white/80 text-[11px] font-bold uppercase tracking-wider mt-0.5">{card.subtitle}</p>
                )}
                {card.description && (
                    <p className="text-white/60 text-[11px] line-clamp-2 mt-0.5">{card.description}</p>
                )}
                <div className="mt-3 self-start inline-flex items-center gap-1.5 bg-white/[0.12] hover:bg-white/25 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-colors">
                    {card.buttonText || 'CLAIM NOW'} <ArrowRight size={10} />
                </div>
            </div>
            {card.charImage && (
                <img
                    src={card.charImage}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="absolute right-0 bottom-0 h-full max-h-36 object-contain"
                />
            )}
        </Link>
    );
}

export default function PromoCarousel() {
    const [cards, setCards] = useState<PromoCardItem[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                const res = await api.get('/promo-cards?active=true');
                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    setCards(res.data);
                }
            } catch (error) {
                console.error("Failed to fetch promo cards", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCards();
    }, []);

    const itemsPerSlide = 3;
    const totalSlides = Math.max(1, Math.ceil(cards.length / itemsPerSlide));

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    };

    useEffect(() => {
        if (totalSlides <= 1) return;
        const timer = setInterval(nextSlide, 5000);
        return () => clearInterval(timer);
    }, [totalSlides]);

    if (loading) {
        return <div className="h-[250px] bg-white/[0.03] rounded-2xl border border-white/[0.06] animate-pulse" />;
    }

    if (cards.length === 0) return null;

    const currentCards = cards.slice(
        currentSlide * itemsPerSlide,
        (currentSlide + 1) * itemsPerSlide
    );

    return (
        <div className="relative group">
            <div className="overflow-hidden rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-500 ease-in-out">
                    {currentCards.map((card, index) => (
                        <div key={card._id || index} className="w-full">
                            <PromoTile card={card} />
                        </div>
                    ))}
                </div>
            </div>

            {totalSlides > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 border border-white/[0.08] text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                        aria-label="Previous"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 border border-white/[0.08] text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                        aria-label="Next"
                    >
                        <ChevronRight size={24} />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {Array.from({ length: totalSlides }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                aria-label={`Go to slide ${idx + 1}`}
                                className={`h-2 rounded-full transition-all ${currentSlide === idx ? "bg-amber-500 w-6" : "bg-white/40 w-2"
                                    }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
