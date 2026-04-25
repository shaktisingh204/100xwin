"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ModalProvider } from "@/context/ModalContext";
import { SocketProvider } from "@/context/SocketContext";

import { LayoutProvider } from "@/context/LayoutContext";
import { WalletProvider } from "@/context/WalletContext";
import { BetProvider } from "@/context/BetContext";
import { Toaster } from "react-hot-toast";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import AuthModal from "@/components/auth/AuthModal";
import DepositModal from "@/components/deposit/DepositModal";
import ManualDepositModal from "@/components/deposit/ManualDepositModal";
import WithdrawModal from "@/components/deposit/WithdrawModal";
import DepositChooserSheet from "@/components/DepositModal/DepositChooserSheet";
import { useModal } from "@/context/ModalContext";

function DepositChooserMount() {
  const { isDepositChooserOpen, closeDeposit, openUPIDeposit, openManualDeposit } = useModal();
  return (
    <DepositChooserSheet
      isOpen={isDepositChooserOpen}
      onClose={closeDeposit}
      onChooseDeposit={() => openUPIDeposit()}
      onChooseCrypto={() => openUPIDeposit({ initialTab: "crypto" })}
      onChooseManual={() => openManualDeposit()}
    />
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>

        <ModalProvider>
          <WalletProvider>
            <BetProvider>
              <LayoutProvider>
                <div className="min-h-screen flex flex-col">
                  <Header />
                  <div className="flex flex-1">
                    {/* Static sidebar — full height, no scroll */}
                    <Sidebar />
                    {/* Content area — scrolls independently, footer lives here */}
                    <div className="flex-1 min-w-0 flex flex-col overflow-y-auto h-[calc(100dvh-var(--header-height))] pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] md:pb-0">
                      <main className="flex-1">{children}</main>
                      <Footer />
                    </div>
                  </div>
                  <MobileBottomNav />
                </div>
                <AuthModal />
                <DepositChooserMount />
                <DepositModal />
                <ManualDepositModal />
                <WithdrawModal />
                <Toaster
                  position="top-center"
                  toastOptions={{ style: { background: "#1a1d24", color: "#fff", border: "1px solid rgba(255,255,255,0.06)" } }}
                />
              </LayoutProvider>
            </BetProvider>
          </WalletProvider>
        </ModalProvider>

      </SocketProvider>
    </AuthProvider>
  );
}
