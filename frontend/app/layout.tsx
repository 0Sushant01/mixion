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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
        {/* Main app container */}
        <div className="min-h-screen flex flex-col">
          {/* Top header */}
          <header className="bg-white shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                  M
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">MIXION</h1>
                  <p className="text-xs text-gray-500">Kiosk demo</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Device: demo</span>
                <span className="text-sm text-green-600">● online</span>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
            {/* Render actual app children (server-rendered pages) */}
            <div className="mt-6">{children}</div>
          </main>

          <footer className="bg-white border-t py-3">
            <div className="max-w-6xl mx-auto px-4 text-sm text-gray-500">© MIXION demo</div>
          </footer>
        </div>

        {/* Kiosk behavior moved into `components/Kiosk` client component. */}
      </body>
    </html>
  );
}
