import Link from 'next/link';
import { casinoService } from '@/services/casino';
import React, { useEffect, useMemo, useState } from 'react';
import ProviderLogo from './ProviderLogo';

interface ProviderListItem {
    id: string | number;
    name: string;
    provider: string;
    code: string;
    image?: string;
    count: number;
}

interface ProviderListProps {
    selectedCategory: string;
    selectedProvider: string;
    onSelectProvider: (provider: string) => void;
    previewLimit?: number;
    viewAllHref?: string;
}

const ProviderList: React.FC<ProviderListProps> = ({
    selectedCategory,
    selectedProvider,
    onSelectProvider,
    previewLimit,
    viewAllHref,
}) => {
    const [providers, setProviders] = useState<ProviderListItem[]>([]);

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                // Pass selectedCategory to fetch filtered providers and counts
                const cat = selectedCategory === 'all' ? undefined : selectedCategory;
                const data = await casinoService.getProviders(cat);
                setProviders(Array.isArray(data) ? data as ProviderListItem[] : []);
            } catch (error) {
                console.error("Failed to fetch providers", error);
            }
        };
        fetchProviders();
    }, [selectedCategory]);

    const providersWithGames = useMemo(
        () => providers.filter((provider) => provider.count > 0),
        [providers],
    );

    const visibleProviders = useMemo(() => {
        if (!previewLimit || previewLimit <= 0 || providersWithGames.length <= previewLimit) {
            return providersWithGames;
        }

        const previewProviders = providersWithGames.slice(0, previewLimit);
        if (selectedProvider === 'all') {
            return previewProviders;
        }

        const selectedProviderRecord = providersWithGames.find((provider) => provider.provider === selectedProvider);
        if (!selectedProviderRecord || previewProviders.some((provider) => provider.provider === selectedProvider)) {
            return previewProviders;
        }

        return [
            ...previewProviders.slice(0, Math.max(previewLimit - 1, 0)),
            selectedProviderRecord,
        ];
    }, [previewLimit, providersWithGames, selectedProvider]);

    const hiddenProvidersCount = Math.max(providersWithGames.length - visibleProviders.length, 0);
    const resetLabel = previewLimit ? 'All Games' : 'All Providers';

    return (
        <div className="mb-4">
            <h4 className="text-sm font-bold text-text-muted mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-brand-gold rounded-full"></span>
                Top Providers
            </h4>
            <div className="flex gap-2 md:gap-3 overflow-x-auto custom-scrollbar pb-2 pt-4">
                <div
                    key="all"
                    onClick={() => onSelectProvider('all')}
                    className={`min-w-[100px] md:min-w-[120px] h-[40px] md:h-[50px] bg-bg-elevated rounded-lg flex items-center justify-center p-2 md:p-3 transition-all cursor-pointer group shadow-sm hover:shadow-glow-gold hover:-translate-y-0.5 ${selectedProvider === 'all' ? 'bg-bg-hover shadow-glow-gold ring-1 ring-brand-gold/50' : 'text-text-muted hover:text-text-primary'}`}
                >
                    <span className={`font-bold text-[10px] md:text-xs uppercase tracking-wider ${selectedProvider === 'all' ? 'text-brand-gold' : ''}`}>{resetLabel}</span>
                </div>
                {visibleProviders.map((provider) => (
                    <div
                        key={provider.id}
                        onClick={() => onSelectProvider(provider.provider)}
                        className={`relative min-w-[100px] md:min-w-[120px] h-[40px] md:h-[50px] bg-bg-elevated rounded-lg flex items-center justify-center p-2 md:p-3 transition-all cursor-pointer group shadow-sm hover:shadow-glow-gold hover:-translate-y-0.5 ${selectedProvider === provider.provider ? 'bg-bg-hover shadow-glow-gold ring-1 ring-brand-gold/50 grayscale-0' : 'grayscale hover:grayscale-0'}`}
                    >
                        <ProviderLogo
                            provider={provider}
                            alt={provider.name}
                            className={`h-[30px] w-auto max-w-full object-contain ${selectedProvider === provider.provider ? 'grayscale-0' : 'grayscale'} group-hover:grayscale-0 transition-all`}
                            fallbackClassName="font-bold text-xs uppercase tracking-wider text-text-muted group-hover:text-text-primary"
                            fallbackText={provider.name}
                        />
                        {provider.count > 0 && (
                            <span className="absolute -top-3 -right-2 bg-brand-gold text-text-inverse text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-10">
                                {provider.count}
                            </span>
                        )}
                    </div>
                ))}
                {viewAllHref && hiddenProvidersCount > 0 && (
                    <Link
                        href={viewAllHref}
                        className="relative min-w-[100px] md:min-w-[120px] h-[40px] md:h-[50px] rounded-lg border border-brand-gold/30 bg-brand-gold/10 flex items-center justify-center p-2 md:p-3 transition-all shadow-sm hover:shadow-glow-gold hover:-translate-y-0.5"
                    >
                        <span className="font-bold text-[10px] md:text-xs uppercase tracking-wider text-brand-gold">All</span>
                        <span className="absolute -top-3 -right-2 bg-brand-gold text-text-inverse text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-10">
                            +{hiddenProvidersCount}
                        </span>
                    </Link>
                )}
            </div>
        </div>
    );
};

export default ProviderList;
