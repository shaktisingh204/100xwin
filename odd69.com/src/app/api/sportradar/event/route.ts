// ─────────────────────────────────────────────────────────────
// GET /api/sportradar/event?eventId=sr:match:70262604
//
// Server-side proxy to adxwin's /api/sportradar-proxy/event/:id.
// Bypasses the local NestJS backend so the match-detail page
// works even when this server's NestJS binary is out-of-date.
//
// Response shape matches what the page expects:
//   { success: true, data: <event-with-markets> }
//   { success: false, data: null, message: ... }
//
// Env vars (server-side only — keep token off the client bundle):
//   SR_PROXY_URL    = https://zeero.bet/api/sportradar-proxy
//   SR_PROXY_TOKEN  = <matches adxwin's EXTERNAL_API_TOKEN>
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROXY_URL = (
  process.env.SR_PROXY_URL ?? 'https://zeero.bet/api/sportradar-proxy'
).replace(/\/+$/, '');
const PROXY_TOKEN = process.env.SR_PROXY_TOKEN ?? '';

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get('eventId');
  if (!eventId) {
    return NextResponse.json(
      { success: false, data: null, message: 'eventId is required' },
      { status: 400 },
    );
  }

  if (!PROXY_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'SR_PROXY_TOKEN not configured on server',
      },
      { status: 500 },
    );
  }

  const upstream = `${PROXY_URL}/event/${encodeURIComponent(eventId)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5_000);

  try {
    const res = await fetch(upstream, {
      headers: { 'x-api-token': PROXY_TOKEN },
      cache: 'no-store',
      signal: ctrl.signal,
    });

    if (res.status === 404) {
      return NextResponse.json(
        { success: false, data: null, message: 'Event not found' },
        { status: 200 },
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `Upstream returned ${res.status}`,
        },
        { status: 200 },
      );
    }

    // adxwin envelope: { key, source, data: <event> }
    const body = (await res.json()) as { data?: unknown };
    const eventData = body?.data ?? null;

    if (!eventData) {
      return NextResponse.json(
        { success: false, data: null, message: 'Empty upstream response' },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { success: true, data: eventData },
      {
        headers: {
          // Page polls — short cache lets nginx absorb bursts without
          // making the user see stale odds for more than a beat.
          'Cache-Control': 'private, max-age=1',
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, data: null, message: `Proxy fetch failed: ${msg}` },
      { status: 200 },
    );
  } finally {
    clearTimeout(timer);
  }
}
