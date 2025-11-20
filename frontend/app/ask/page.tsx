"use client";

import React from "react";
import { useRouter } from "next/navigation";
import IdleTimer from "../components/IdleTimer";
import { logout } from "../components/session";

export default function AskPage() {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] rounded-none bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col shadow-2xl sm:rounded-3xl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/10 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Enjoy Your Drink!</h1>
            <p className="text-gray-300 text-sm mt-1">Thank you for your order</p>
          </div>
          <div className="text-xs text-gray-400">
            <IdleTimer onTimeout={() => logout((p) => router.push(p))} timeoutSeconds={15} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl text-center animate-fadeIn">
          {/* Celebration Icon */}
          <div className="text-6xl mb-6 animate-bounce">🍹</div>

          {/* Main Question */}
          <h2 className="text-4xl font-bold text-white mb-2">Another one?</h2>
          <p className="text-gray-300 mb-8 text-lg">Would you like to order another drink?</p>

          {/* Buttons */}
          <div className="flex gap-4 justify-center flex-col sm:flex-row">
            <button
              onClick={() => router.push("/products")}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/50 transition-all transform hover:scale-105 text-lg"
            >
              Yes, Another One! 🎉
            </button>
            <button
              onClick={() => logout((p) => router.push(p))}
              className="flex-1 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all text-lg"
            >
              No, Exit
            </button>
          </div>

          {/* Footer Message */}
          <p className="text-gray-400 text-sm mt-8">Auto logout in 15 seconds</p>
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
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-bounce {
          animation: bounce 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
