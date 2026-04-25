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
    <div className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-6 text-center px-6 py-12 overflow-hidden bg-gold-soft">
      <div className="pointer-events-none absolute inset-0 dotgrid opacity-40" />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[300px] rounded-full blur-[120px]"
        style={{ background: "var(--gold-halo)" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-[18px] bg-[var(--gold-soft)] border border-[var(--line-gold)] grid place-items-center animate-pulse-gold">
          <Gift size={32} className="text-[var(--gold-bright)]" />
        </div>

        <div className="chip chip-gold">
          🎁 Referral invite
        </div>

        <h1 className="t-display text-[28px] sm:text-[32px] text-[var(--ink)] tracking-tight">
          You&apos;ve been invited to{" "}
          <span className="font-display">
            odd<span className="text-gold-grad">69</span>
          </span>
        </h1>

        <p className="text-[13px] text-[var(--ink-dim)] max-w-xs leading-relaxed">
          {refCode ? (
            <>
              Your referral code{" "}
              <span className="text-[var(--gold-bright)] num font-bold">{refCode}</span>{" "}
              has been saved. Opening sign up for you…
            </>
          ) : (
            "Opening sign up for you…"
          )}
        </p>

        <Loader2 className="w-5 h-5 text-[var(--gold-bright)] animate-spin mt-1" />
      </div>
    </div>
  );
}

export default function AuthSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-64px)] grid place-items-center bg-[var(--bg-base)]">
          <Loader2 className="w-7 h-7 text-[var(--gold-bright)] animate-spin" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
