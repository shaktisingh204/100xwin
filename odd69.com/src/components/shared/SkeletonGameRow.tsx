'use client';

interface SkeletonGameRowProps {
    count?: number;
    label?: string;
}

export default function SkeletonGameRow({ count = 8 }: SkeletonGameRowProps) {
    return (
        <div>
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-3 px-3">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded skeleton" />
                    <div className="w-28 h-4 rounded skeleton" />
                    <div className="w-8 h-4 rounded-md skeleton" />
                </div>
                <div className="w-14 h-8 rounded-xl skeleton" />
            </div>

            {/* Card row */}
            <div className="flex gap-1.5 overflow-x-hidden pb-2 pl-3">
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-shrink-0 w-[calc((100vw-40px)/3.1)] md:w-[155px] aspect-[3/4] rounded-[10px] skeleton"
                    />
                ))}
            </div>
        </div>
    );
}
