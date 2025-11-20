import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MIXION Kiosk",
  description: "MIXION frontend demo - kiosk UI for testing Tailwind + Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#0e7490] text-white`}
      >
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-cyan-400/20 bg-gradient-to-r from-cyan-900/40 to-emerald-900/40 backdrop-blur-xl shadow-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-2xl font-extrabold shadow-lg">
                  M
                </div>
                <div>
                  <p className="text-lg font-extrabold tracking-tight text-cyan-200 drop-shadow">MIXION</p>
                  <p className="text-xs text-cyan-100/70">Kiosk demo</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-cyan-100/80">
                <a href="/" className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-xl hover:from-cyan-500/40 hover:to-emerald-500/40 shadow transition-all">Home</a>
                <span className="hidden sm:inline">Device: demo</span>
                <span className="flex items-center gap-2 rounded-full border border-emerald-400/40 px-3 py-1 text-emerald-200 bg-emerald-900/30 shadow">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                  online
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full">
            <div className="mx-auto mt-4 w-full px-3 pb-8 sm:px-6 lg:px-12">
              <div className="w-full rounded-none border border-cyan-400/10 bg-gradient-to-br from-white/10 to-white/5 p-3 shadow-[0_30px_80px_rgba(15,23,42,0.45)] sm:rounded-3xl sm:p-6 lg:p-10 backdrop-blur-xl">
                {children}
              </div>
            </div>
          </main>

          <footer className="border-t border-cyan-400/20 bg-gradient-to-r from-cyan-900/40 to-emerald-900/40 text-sm text-cyan-100/80 shadow-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3">
              <span className="font-bold text-cyan-200">© MIXION demo</span>
              <span className="text-xs">Crafted for kiosk previews</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
