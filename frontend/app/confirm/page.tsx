"use client";

import React from "react";
import { useRouter } from "next/navigation";
import IdleTimer from "../components/IdleTimer";
import { getSelectedRecipe, getCurrentCustomer, logout } from "../components/session";

export default function ConfirmPage() {
  const router = useRouter();
  const [recipe, setRecipe] = React.useState<any>(null);

  React.useEffect(() => {
    const c = getCurrentCustomer();
    if (!c) return router.push("/login");
    const r = getSelectedRecipe();
    if (!r) return router.push("/products");
    setRecipe(r);
  }, [router]);

  if (!recipe) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/10 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Confirm Your Selection</h1>
            <p className="text-gray-300 text-sm mt-1">Review before proceeding</p>
          </div>
          <div className="text-xs text-gray-400">
            <IdleTimer onTimeout={() => logout((p) => router.push(p))} timeoutSeconds={15} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl animate-fadeIn">
          {/* Recipe Card */}
          <div className="text-center">
            <div className="inline-block px-4 py-1 bg-indigo-500/20 rounded-full text-indigo-300 text-xs font-semibold uppercase tracking-wide mb-6">
              Ready to Order
            </div>

            <h2 className="text-5xl font-bold text-white mb-4">{recipe.recipe_name}</h2>

            {/* Video Preview */}
            <div className="relative w-full h-72 rounded-2xl overflow-hidden mb-8 shadow-xl border border-white/10">
              <video
                src={recipe.video_url}
                className="w-full h-full object-cover"
                muted
                loop
                autoPlay
              >
                <source src={recipe.video_url} />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-40" />
            </div>

            {/* Price Display */}
            <div className="mb-8">
              <p className="text-gray-400 text-sm uppercase tracking-wide mb-2">Total Amount</p>
              <p className="text-6xl font-bold text-indigo-300">₹{recipe.price}</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push("/payment")}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-105"
              >
                Proceed to Payment
              </button>
              <button
                onClick={() => router.push("/products")}
                className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all"
              >
                Back to Menu
              </button>
            </div>
          </div>
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
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
