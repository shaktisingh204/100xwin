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
                    <div className="flex-1 min-w-0 flex flex-col overflow-y-auto h-[calc(100vh-56px)]">
                      <main className="flex-1">{children}</main>
                      <Footer />
                    </div>
                  </div>
                  <MobileBottomNav />
                </div>
                <AuthModal />
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
