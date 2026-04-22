"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { openLogin } = useModal();
    const router = useRouter();
    const pathname = usePathname();

    const isReferralPage = pathname === '/profile/referral';

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            openLogin();
            router.replace('/');
        }
    }, [authLoading, isAuthenticated, openLogin, router]);

    // Show spinner while auth state resolves to avoid flash of protected content
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#06080c] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Block render until redirect fires
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className={`bg-[#06080c] font-[family-name:var(--font-poppins)] ${isReferralPage ? 'flex justify-center' : ''}`}>
            <main className={`flex-1 min-w-0 bg-[#06080c] ${isReferralPage ? 'w-full xl:max-w-[75%] mx-auto' : ''}`}>
                <div className="max-w-[900px] mx-auto px-4 md:px-8 py-6 text-white">
                    {children}
                </div>
            </main>
        </div>
    );
}
