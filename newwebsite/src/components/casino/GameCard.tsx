"use client";

import React from 'react';
import { Play } from 'lucide-react';

interface GameCardProps {
    name: string;
    image: string;
    provider: string;
    tag?: string;
    layout?: 'grid' | 'row';
    onClick?: () => void;
    onError?: () => void;
}

const GameCard: React.FC<GameCardProps> = ({
    name,
    image,
    provider,
    tag,
    layout = 'row',
    onClick,
    onError
}) => {
    const CF_BASE = 'https://imagedelivery.net/l7vrHxYm1V8kfxard9QBnQ';
    const FALLBACK_IMG = 'https://images.unsplash.com/photo-1605218427306-022ba8c15661?q=80&w=600&auto=format&fit=crop';

    const resolveUrl = React.useCallback((src: string) => {
        if (!src) return FALLBACK_IMG;
        if (src.startsWith('http')) return src;
        // icon may already be '{provider}/{filename}.ext' or just '{filename}.ext'
        const iconNoExt = src.replace(/\.[^.]+$/, '');
        const iconPath = iconNoExt.includes('/')
            ? iconNoExt.split('/').map(encodeURIComponent).join('/')
            : `${encodeURIComponent(provider)}/${encodeURIComponent(iconNoExt)}`;
        return `${CF_BASE}/${iconPath}/public`;
    }, [provider]);

    const [imgSrc, setImgSrc] = React.useState(() => resolveUrl(image));
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
        setImgSrc(resolveUrl(image));
        setHasError(false);
    }, [image, resolveUrl]);

    const handleError = () => {
        if (!hasError) {
            setHasError(true);
            setImgSrc(FALLBACK_IMG);
        }
        onError?.();
    };

    const sizeClasses = layout === 'grid'
        ? 'w-full min-w-0 aspect-[167/208]'
        : 'flex-shrink-0 w-[123px] h-[163px] md:w-[167px] md:h-[208px]';

    return (
        <div
            onClick={onClick}
            className={`group relative bg-bg-card rounded-xl overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-glow-gold ${sizeClasses}`}
        >
            {/* Image */}
            <img
                src={imgSrc}
                alt={name}
                onError={handleError}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
            />

            {/* Tag */}
            {tag && (
                <div className="absolute top-2 left-2 z-10 bg-jackpot text-black text-[10px] font-black px-2 py-0.5 rounded shadow">
                    {tag}
                </div>
            )}

            {/* Overlay on Hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                <button className="w-12 h-12 bg-brand-gold rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 mb-2 shadow-lg shadow-brand-gold/40">
                    <Play size={20} fill="white" className="ml-1" />
                </button>
                <span className="text-text-primary font-bold text-sm text-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    {name}
                </span>
                {provider && (
                    <span className="text-text-muted text-[10px] uppercase tracking-wide transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-50">
                        {provider}
                    </span>
                )}
            </div>

        </div>
    );
};

export default GameCard;
