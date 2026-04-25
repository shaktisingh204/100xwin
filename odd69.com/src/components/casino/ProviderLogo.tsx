"use client";

import React, { useState } from 'react';

interface ProviderLike {
    image?: string;
    provider?: string;
    code?: string;
}

interface ProviderLogoProps {
    provider: ProviderLike;
    alt: string;
    className?: string;
    fallbackClassName?: string;
    fallbackText?: string;
}

function getProviderSources(provider: ProviderLike): string[] {
    const customImage = provider.image?.trim();
    return customImage ? [customImage] : [];
}

function getFallbackLabel(label: string): string {
    const normalized = label.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
    return normalized || 'PR';
}

export default function ProviderLogo({
    provider,
    alt,
    className = '',
    fallbackClassName = '',
    fallbackText,
}: ProviderLogoProps) {
    const sources = getProviderSources(provider);
    const [failedSources, setFailedSources] = useState<Record<string, boolean>>({});
    const src = sources.find((source) => !failedSources[source]);

    if (!src) {
        return (
            <span className={fallbackClassName}>
                {getFallbackLabel(fallbackText || alt)}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={`${className} grayscale opacity-40 transition-all duration-200 hover:opacity-80 hover:grayscale-0`}
            loading="lazy"
            onError={() => setFailedSources((current) => ({ ...current, [src]: true }))}
        />
    );
}
