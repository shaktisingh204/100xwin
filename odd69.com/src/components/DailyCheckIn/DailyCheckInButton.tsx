"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import DailyCheckInModal from "./DailyCheckInModal";

interface Props {
  compact?: boolean;
}

export default function DailyCheckInButton({ compact = false }: Props) {
  const { user, isAuthenticated } = useAuth();
  const { fiatBalance, depositWageringDone, depositWageringRequired } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  // null = loading, true/false = resolved
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState<boolean | null>(null);

  const hasDeposited =
    fiatBalance > 0 || depositWageringDone > 0 || depositWageringRequired > 0;

  // Fetch admin config once (fail open)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/daily-checkin/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setEnabled(d?.enabled !== false);
          setHidden(d?.hidden === true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(true);
          setHidden(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Check if today's reward is pending
  const checkPending = useCallback(() => {
    if (!user) return;
    const storedKey = `checkin_${user.id || "guest"}`;
    const stored = localStorage.getItem(storedKey);
    if (!stored) {
      setHasPending(true);
      return;
    }
    try {
      const { lastCheckin } = JSON.parse(stored);
      const today = new Date().toDateString();
      setHasPending(!lastCheckin || new Date(lastCheckin).toDateString() !== today);
    } catch {
      setHasPending(true);
    }
  }, [user]);

  useEffect(() => {
    checkPending();
    const id = setInterval(checkPending, 60_000);
    return () => clearInterval(id);
  }, [checkPending]);

  // Hide: not authenticated, still loading config, admin disabled it, or hidden
  if (!isAuthenticated || !user || enabled === null || enabled === false || hidden) {
    return null;
  }

  const isGlowing = hasPending && hasDeposited;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.92 }}
        aria-label="Daily Rewards & Offers"
        title="Daily Rewards"
        className="relative flex items-center justify-center flex-shrink-0"
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: isGlowing
            ? "linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(217,119,6,0.12) 100%)"
            : "rgba(255,255,255,0.04)",
          border: isGlowing
            ? "1.5px solid rgba(245,158,11,0.6)"
            : "1px solid rgba(255,255,255,0.06)",
          boxShadow: isGlowing
            ? "0 0 12px rgba(245,158,11,0.55), 0 0 28px rgba(245,158,11,0.25), 0 0 56px rgba(245,158,11,0.05)"
            : "none",
          color: isGlowing ? "#f59e0b" : "rgba(255,255,255,0.55)",
        }}
      >
        {/* Pulse ring layer 1 */}
        {isGlowing && (
          <motion.span
            aria-hidden
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: -1,
              borderRadius: 11,
              border: "2px solid rgba(245,158,11,0.55)",
              pointerEvents: "none",
            }}
          />
        )}
        {/* Pulse ring layer 2 */}
        {isGlowing && (
          <motion.span
            aria-hidden
            animate={{ scale: [1, 1.9, 1], opacity: [0.25, 0, 0.25] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            style={{
              position: "absolute",
              inset: -1,
              borderRadius: 11,
              border: "2px solid rgba(245,158,11,0.28)",
              pointerEvents: "none",
            }}
          />
        )}

        <Gift size={18} strokeWidth={2.2} />

        {/* Red notification dot */}
        {isGlowing && (
          <AnimatePresence>
            <motion.span
              key="offer-badge"
              aria-hidden
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 14 }}
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ef4444",
                border: "2px solid #0c0f14",
                boxShadow: "0 0 6px rgba(239,68,68,0.7)",
              }}
            />
          </AnimatePresence>
        )}
      </motion.button>

      {isOpen && (
        <DailyCheckInModal
          hasDeposited={hasDeposited}
          onClose={() => {
            setIsOpen(false);
            checkPending();
          }}
        />
      )}
    </>
  );
}
