'use client';

import SkeletonGameCard from './SkeletonGameCard';

interface SkeletonGameRowProps {
    /** How many cards to show — default 10 */
    count?: number;
    /** Optional section header label */
    label?: string;
}

/**
 * SkeletonGameRow — a full horizontal-scroll row of shimmer game cards.
 * Matches the exact layout produced by HomeGameList.
 */
export default function SkeletonGameRow({ count = 10, label }: SkeletonGameRowProps) {
    return (
        <div>
            {/* Optional header skeleton */}
            {label !== undefined && (
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {/* Icon placeholder */}
                        <div className="w-5 h-5 rounded skeleton-block" />
                        {/* Title placeholder */}
                        <div className="w-32 h-5 rounded skeleton-block" />
                    </div>
                    {/* "All" button placeholder */}
                    <div className="w-16 h-7 rounded-lg skeleton-block" />
                </div>
            )}

            {/* Horizontal card row */}
            <div className="flex gap-2.5 overflow-x-hidden pb-2">
                {Array.from({ length: count }).map((_, i) => (
                    <SkeletonGameCard key={i} />
                ))}
            </div>
        </div>
    );
}
