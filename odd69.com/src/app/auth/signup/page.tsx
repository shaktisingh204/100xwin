"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useModal } from "@/context/ModalContext";

function SignupRedirect() {
  const router = useRouter();
  const { openRegister } = useModal();
  const params = useSearchParams();

  useEffect(() => {
    // Store referral code if present
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("referralCode", ref);
    }
    // Open the register modal and redirect to home
    openRegister();
    router.push("/");
  }, [openRegister, router, params]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-white/30" />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 size={24} className="animate-spin text-white/30" /></div>}>
      <SignupRedirect />
    </Suspense>
  );
}
