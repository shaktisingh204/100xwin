"use client";

import React from "react";
import { ModalProvider, useModal } from "@/context/ModalContext";
import LoginModal from "@/components/LoginModal/LoginModal";
import RegisterModal from "@/components/RegisterModal/RegisterModal";
import DepositModal from "@/components/DepositModal/DepositModal";
import WithdrawModal from "@/components/WithdrawModal/WithdrawModal";
import DepositChooserSheet from "@/components/DepositModal/DepositChooserSheet";
import ManualDepositScreen from "@/components/DepositModal/ManualDepositScreen";
import { AuthProvider } from "@/context/AuthContext";
import { BetProvider } from "@/context/BetContext";
import { SocketProvider } from "@/context/SocketContext";
import { LayoutProvider } from "@/context/LayoutContext";
import { WalletProvider } from "@/context/WalletContext";
import PageTransition from "./PageTransition";
import MobileBottomNav from "./MobileBottomNav";
import MobileCategoryBar from "./MobileCategoryBar";
import { Toaster } from "react-hot-toast";
import AnnouncementBanner from "./AnnouncementBanner";

const ModalContainer = () => {
    const {
        isLoginOpen, closeLogin,
        isRegisterOpen, closeRegister, openLogin, openRegister,
        isDepositChooserOpen, closeDeposit,
        isDepositOpen, openUPIDeposit, closeUPIDeposit,
        isManualDepositOpen, manualDepositAllowBack, openManualDeposit, closeManualDeposit,
        isWithdrawOpen, closeWithdraw,
    } = useModal();

    return (
        <>
            {isLoginOpen && <LoginModal onClose={closeLogin} onRegisterClick={openRegister} />}
            {isRegisterOpen && <RegisterModal onClose={closeRegister} onLoginClick={openLogin} />}

            {/* Deposit chooser — entry point */}
            <DepositChooserSheet
                isOpen={isDepositChooserOpen}
                onClose={closeDeposit}
                onChooseUPI={openUPIDeposit}
                onChooseManual={openManualDeposit}
            />

            {/* UPI gateway deposit — separate full modal */}
            <DepositModal isOpen={isDepositOpen} onClose={closeUPIDeposit} />

            {/* Manual UPI deposit — separate full sheet */}
            <ManualDepositScreen
                isOpen={isManualDepositOpen}
                onClose={closeManualDeposit}
                onBackToGateway={() => { closeManualDeposit(); openUPIDeposit(); }}
                allowBack={manualDepositAllowBack}
            />

            {isWithdrawOpen && <WithdrawModal onClose={closeWithdraw} />}
        </>
    );
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <SocketProvider>
                <ModalProvider>
                    <WalletProvider>
                        <BetProvider>
                            <LayoutProvider>
                                <AnnouncementBanner />
                                <React.Suspense fallback={<div className="h-[50px] md:hidden bg-[#1A1D21]" />}>
                                    <MobileCategoryBar />
                                </React.Suspense>

                                <PageTransition>
                                    {children}
                                </PageTransition>
                                <MobileBottomNav />
                                <ModalContainer />
                                <Toaster position="top-center" toastOptions={{
                                    style: {
                                        background: '#333',
                                        color: '#fff',
                                    },
                                }} />

                            </LayoutProvider>
                        </BetProvider>
                    </WalletProvider>
                </ModalProvider>
            </SocketProvider>
        </AuthProvider>
    );
}
