import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    return NextResponse.redirect(new URL('/', request.url), 308)
}

export const config = {
    matcher: '/login/:path*',
}
