"use client";

import React from "react";
import { useRouter } from "next/navigation";
import IdleTimer from "../components/IdleTimer";
import { logout } from "../components/session";

export default function AskPage() {
  const router = useRouter();

  return (
    <div className="full-page-overlay fixed inset-0 z-[9999] h-screen w-screen bg-[#0F172A] text-[#F8FAFC] overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#1E293B]/95 backdrop-blur-md border-b border-[#7C3AED]/20 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC]">Enjoy Your Drink!</h1>
            <p className="text-[#94A3B8] text-xs">Thank you for your order</p>
          </div>
          <div className="text-xs text-[#94A3B8]">
            <IdleTimer onTimeout={() => logout((p) => router.push(p))} timeoutSeconds={15} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg bg-[#1E293B] backdrop-blur-lg rounded-2xl border border-[#7C3AED]/20 p-8 shadow-lg text-center animate-fadeIn">
          {/* Celebration Icon */}
          <div className="text-6xl mb-6">🍹</div>

          {/* Main Question */}
          <h2 className="text-3xl font-bold text-[#F8FAFC] mb-2">Another one?</h2>
          <p className="text-[#94A3B8] mb-8 text-base">Would you like to order another drink?</p>

          {/* Buttons */}
          <div className="flex gap-4 justify-center flex-col sm:flex-row">
            <button
              onClick={() => router.push("/products")}
              className="flex-1 px-8 py-4 bg-[#7C3AED] hover:bg-[#8B5CF6] text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 text-lg"
            >
              Yes, Another One! 🎉
            </button>
            <button
              onClick={() => logout((p) => router.push(p))}
              className="flex-1 px-8 py-4 bg-[#0F172A] text-[#F8FAFC] font-semibold rounded-xl border border-[#7C3AED]/30 transition-all hover:bg-[#7C3AED]/10 text-lg"
            >
              No, Exit
            </button>
          </div>

          {/* Footer Message */}
          <p className="text-[#94A3B8] text-xs mt-8">Auto logout in 15 seconds</p>
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.45s ease-out;
        }
      `}</style>
    </div>
  );
}
