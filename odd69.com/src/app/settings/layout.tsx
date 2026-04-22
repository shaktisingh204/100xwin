"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { openLogin } = useModal();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            openLogin();
            router.replace("/");
        }
    }, [authLoading, isAuthenticated, openLogin, router]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#06080c] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <div className="bg-[#06080c] font-[family-name:var(--font-poppins)]">
            <main className="flex-1 min-w-0 bg-[#06080c]">
                <div className="max-w-[860px] mx-auto px-4 md:px-8 py-6 text-white">
                    {children}
                </div>
            </main>
        </div>
    );
}
