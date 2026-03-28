import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Odd69 — Premium Sports Betting & Casino",
  description: "India's fastest-growing betting platform. Live sports, casino, crash games, and instant payouts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-[#06080c] text-white antialiased font-[family-name:var(--font-inter)]">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
