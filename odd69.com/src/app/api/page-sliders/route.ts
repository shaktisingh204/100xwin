// GET /api/page-sliders?page=HOME|CASINO|SPORTS
// Proxy to the backend (which owns the page-slider storage in odd69).

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.odd69.com/api';

export async function GET(req: NextRequest) {
    try {
        const page = req.nextUrl.searchParams.get('page')?.toUpperCase();
        const qs = page ? `?page=${encodeURIComponent(page)}` : '';

        const res = await fetch(`${BACKEND_URL}/page-sliders${qs}`, {
            headers: { 'Content-Type': 'application/json' },
            next: { revalidate: 30 },
        });

        if (!res.ok) {
            return NextResponse.json(page ? { slider: null } : { sliders: [] });
        }

        const data = await res.json();
        return NextResponse.json(data, {
            headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
        });
    } catch (error) {
        console.error('[/api/page-sliders] error:', error);
        return NextResponse.json({ error: 'Failed to fetch sliders' }, { status: 500 });
    }
}
