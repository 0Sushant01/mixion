"use client";

import React from "react";
import { useRouter } from "next/navigation";
import IdleTimer from "../components/IdleTimer";
import { logout } from "../components/session";

export default function AskPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/60 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Enjoy Your Drink!</h1>
            <p className="text-slate-600 text-sm mt-1">Thank you for your order</p>
          </div>
          <div className="text-xs text-slate-500">
            <IdleTimer onTimeout={() => logout((p) => router.push(p))} timeoutSeconds={15} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl bg-white/60 backdrop-blur-lg rounded-3xl border border-gray-200 p-8 shadow-sm text-center animate-fadeIn">
          {/* Celebration Icon */}
          <div className="text-6xl mb-6">🍹</div>

          {/* Main Question */}
          <h2 className="text-4xl font-bold text-slate-900 mb-2">Another one?</h2>
          <p className="text-slate-600 mb-8 text-lg">Would you like to order another drink?</p>

          {/* Buttons */}
          <div className="flex gap-4 justify-center flex-col sm:flex-row">
            <button
              onClick={() => router.push("/products")}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all transform hover:scale-105 text-lg"
            >
              Yes, Another One! 🎉
            </button>
            <button
              onClick={() => logout((p) => router.push(p))}
              className="flex-1 px-8 py-4 bg-white text-slate-800 font-semibold rounded-xl border border-gray-200 transition-all hover:shadow-sm text-lg"
            >
              No, Exit
            </button>
          </div>

          {/* Footer Message */}
          <p className="text-slate-500 text-sm mt-8">Auto logout in 15 seconds</p>
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
