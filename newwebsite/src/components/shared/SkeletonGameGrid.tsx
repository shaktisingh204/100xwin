'use client';

/**
 * SkeletonGameGrid — shimmer grid for the casino page (GameGrid grid layout).
 * Adapts to the same responsive columns as the real grid.
 */

interface SkeletonGameGridProps {
    count?: number;
}

function SkeletonGridCard() {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="w-full aspect-[3/4] rounded-xl skeleton-block" />
            <div className="h-2.5 w-3/4 mx-auto rounded skeleton-block" />
        </div>
    );
}

export default function SkeletonGameGrid({ count = 18 }: SkeletonGameGridProps) {
    return (
        <div className="space-y-4">
            {/* Section header skeleton */}
            <div className="flex items-center justify-between">
                <div className="w-48 h-6 rounded skeleton-block" />
                <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg skeleton-block" />
                    <div className="w-8 h-8 rounded-lg skeleton-block" />
                </div>
            </div>

            {/* Responsive grid */}
            <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2 md:gap-4">
                {Array.from({ length: count }).map((_, i) => (
                    <SkeletonGridCard key={i} />
                ))}
            </div>
        </div>
    );
}
