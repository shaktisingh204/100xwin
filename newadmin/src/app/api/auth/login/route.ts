import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const backendBase = (
            process.env.NEXT_PUBLIC_API_PROXY_URL ||
            process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/api\/?$/, '') ||
            process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
            'http://127.0.0.1:9828'
        ).replace(/\/+$/, '');

        const backendRes = await fetch(`${backendBase}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await backendRes.json();

        if (!backendRes.ok) {
            return NextResponse.json(
                { message: data.message || "Backend login failed" },
                { status: backendRes.status }
            );
        }

        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error("Login Proxy Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error during login proxy" },
            { status: 500 }
        );
    }
}
