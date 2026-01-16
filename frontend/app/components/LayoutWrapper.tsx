"use client";

import { usePathname } from "next/navigation";
import React from "react";

// Routes where the layout wrapper (header, footer, main container) should be hidden
const FULL_PAGE_ROUTES = ["/products", "/confirm", "/payment", "/ask"];

export default function LayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const isFullPage = mounted && FULL_PAGE_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
    );

    // Always render the same structure to avoid hydration mismatch
    // Use CSS to hide/show elements based on route
    return (
        <>
            {/* Full page overlay - only visible on full-page routes */}
            <div
                className="fixed inset-0 z-[10000] pointer-events-none"
                style={{
                    opacity: isFullPage ? 1 : 0,
                    pointerEvents: isFullPage ? 'auto' : 'none',
                    visibility: isFullPage ? 'visible' : 'hidden',
                }}
            >
                <div className="pointer-events-auto w-full h-full">
                    {children}
                </div>
            </div>

            {/* Regular layout - always rendered but visually hidden on full-page routes */}
            <div
                className="min-h-screen flex flex-col"
                style={{
                    opacity: isFullPage ? 0 : 1,
                    visibility: isFullPage ? 'hidden' : 'visible',
                    pointerEvents: isFullPage ? 'none' : 'auto',
                }}
                aria-hidden={isFullPage}
            >
                <header className="border-b border-[#7C3AED]/20 bg-[#1E293B]/90 backdrop-blur-xl shadow-lg">
                    <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#FACC15] text-lg font-bold text-white shadow-lg">
                                M
                            </div>
                            <div>
                                <p className="text-sm font-bold tracking-tight text-[#F8FAFC]">MIXION</p>
                                <p className="text-xs text-[#94A3B8]">Kiosk demo</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                            <a href="/" className="px-3 py-1.5 bg-[#7C3AED]/20 text-[#7C3AED] rounded-lg hover:bg-[#7C3AED]/30 shadow-sm transition-all">Home</a>
                            <span className="hidden sm:inline">Device: demo</span>
                            <span className="flex items-center gap-1.5 rounded-full border border-[#FACC15]/40 px-2 py-0.5 text-[#FACC15] bg-[#FACC15]/10 shadow-sm">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#FACC15] animate-pulse" />
                                online
                            </span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 w-full">
                    <div className="mx-auto mt-3 w-full px-3 pb-6 sm:px-5 lg:px-10">
                        <div className="w-full rounded-none border border-[#7C3AED]/10 bg-[#1E293B]/60 p-3 shadow-lg sm:rounded-2xl sm:p-5 lg:p-8 backdrop-blur-xl">
                            {!isFullPage && children}
                        </div>
                    </div>
                </main>

                <footer className="border-t border-[#7C3AED]/20 bg-[#1E293B]/90 text-xs text-[#94A3B8] shadow-lg">
                    <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-2">
                        <span className="font-medium text-[#F8FAFC]">© MIXION demo</span>
                        <span className="text-xs">Crafted for kiosk previews</span>
                    </div>
                </footer>
            </div>
        </>
    );
}
