"use client";

import React from 'react';
import { Play, Users } from 'lucide-react';

interface GameCardProps {
    name: string;
    image: string;
    provider: string;
    tag?: string;
    layout?: 'grid' | 'row';
    onClick?: () => void;
    onError?: () => void;
}

const CF_BASE = 'https://imagedelivery.net/l7vrHxYm1V8kfxard9QBnQ';
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1605218427306-022ba8c15661?q=80&w=600&auto=format&fit=crop';

const GameCard: React.FC<GameCardProps> = ({ name, image, provider, tag, layout = 'row', onClick, onError }) => {
    const resolveUrl = React.useCallback((src: string) => {
        if (!src) return FALLBACK_IMG;
        if (src.startsWith('http')) return src;
        const iconNoExt = src.replace(/\.[^.]+$/, '');
        const iconPath = iconNoExt.includes('/')
            ? iconNoExt.split('/').map(encodeURIComponent).join('/')
            : `${encodeURIComponent(provider)}/${encodeURIComponent(iconNoExt)}`;
        return `${CF_BASE}/${iconPath}/public`;
    }, [provider]);

    const [imgSrc, setImgSrc] = React.useState(() => resolveUrl(image));
    const [hasError, setHasError] = React.useState(false);
    const playerCount = React.useMemo(() => {
        const seed = `${name}-${provider}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        return (seed % 190) + 12;
    }, [name, provider]);

    React.useEffect(() => {
        setImgSrc(resolveUrl(image));
        setHasError(false);
    }, [image, resolveUrl]);

    const handleError = () => {
        if (!hasError) { setHasError(true); setImgSrc(FALLBACK_IMG); }
        onError?.();
    };

    // Row: show ~3 full cards + peek of 4th on mobile
    const sizeClasses = layout === 'grid'
        ? 'w-full flex-shrink-0 aspect-[3/4]'
        : 'flex-shrink-0 w-[calc((100vw-40px)/3.1)] md:w-[155px] aspect-[3/4]';

    return (
        <div
            onClick={onClick}
            className={`group relative rounded-[10px] overflow-hidden cursor-pointer bg-white/[0.02] border border-white/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12] ${sizeClasses}`}
        >
            <img
                src={imgSrc}
                alt={name}
                onError={handleError}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
            />

            {tag && (
                <span className="absolute left-2 top-2 z-10 rounded-md bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#1a1208] shadow">
                    {tag}
                </span>
            )}

            {/* Player count pill — bottom right */}
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-bold text-white border border-white/10">
                <Users size={9} />
                {playerCount}
            </span>

            {/* Hover: dark overlay + amber play button */}
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg scale-75 group-hover:scale-100 transition-transform duration-200">
                    <Play size={16} fill="currentColor" className="ml-0.5 text-[#1a1208]" />
                </div>
            </div>
        </div>
    );
};

export default GameCard;
