"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { openLogin } = useModal();

  useEffect(() => {
    if (!isAuthenticated) {
      openLogin();
      router.push("/");
    } else {
      router.push("/profile");
    }
  }, [isAuthenticated, openLogin, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-white/30" />
    </div>
  );
}
