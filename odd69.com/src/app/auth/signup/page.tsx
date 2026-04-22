"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gift, Loader2 } from "lucide-react";
import { useModal } from "@/context/ModalContext";
import { useAuth } from "@/context/AuthContext";

export const dynamic = "force-dynamic";

function SignupContent() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const { openRegister } = useModal();
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (refCode) {
      localStorage.setItem("referralCode", refCode);
    }
  }, [refCode]);

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      router.replace("/profile/referral");
      return;
    }

    openRegister();
    const t = setTimeout(() => router.replace("/"), 300);
    return () => clearTimeout(t);
  }, [loading, isAuthenticated, openRegister, router]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#12161e] to-[#0c0f14] flex flex-col items-center justify-center gap-6 text-center px-6 overflow-hidden">
      <div className="absolute w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Gift size={36} className="text-amber-500" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-black uppercase tracking-wider">
          🎁 Referral Invite
        </div>

        <h1 className="text-2xl font-black text-white italic tracking-tight">
          You&apos;ve been invited to{" "}
          <span className="text-amber-500">Odd</span>
          <span className="text-white">69</span>
        </h1>
        <p className="text-white/50 text-sm max-w-xs leading-relaxed">
          {refCode ? (
            <>
              Your referral code{" "}
              <span className="text-amber-500 font-mono font-bold">{refCode}</span>{" "}
              has been saved. Opening sign up for you...
            </>
          ) : (
            "Opening sign up for you..."
          )}
        </p>

        <Loader2 className="w-6 h-6 text-amber-500 animate-spin mt-2" />
      </div>
    </div>
  );
}

export default function AuthSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-[#12161e] to-[#0c0f14] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
