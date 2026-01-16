"use client";

import React from "react";
import { useRouter } from "next/navigation";
import IdleTimer from "../components/IdleTimer";
import { getSelectedRecipe, logout, SessionRecipe } from "../components/session";

export default function ConfirmPage() {
  const router = useRouter();
  const [recipe, setRecipe] = React.useState<SessionRecipe | null>(null);

  React.useEffect(() => {
    const r = getSelectedRecipe();
    if (!r) return router.push("/products");
    setRecipe(r);
  }, [router]);

  if (!recipe) return null;

  return (
    <div className="full-page-overlay fixed inset-0 z-[9999] h-screen w-screen bg-[#0F172A] text-[#F8FAFC] overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#1E293B]/95 backdrop-blur-md border-b border-[#7C3AED]/20 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC]">Confirm Your Selection</h1>
            <p className="text-[#94A3B8] text-xs">Review before proceeding</p>
          </div>
          <div className="text-xs text-[#94A3B8]">
            <IdleTimer onTimeout={() => logout((p) => router.push(p))} timeoutSeconds={15} />
          </div>
        </div>
      </div>

      {/* Main Content - scrollable */}
      <main className="px-4 py-6">
        <div className="w-full max-w-lg mx-auto bg-[#1E293B] rounded-2xl border border-[#7C3AED]/20 p-6 shadow-lg">
          {/* Recipe Card */}
          <div className="text-center">
            <div className="inline-block px-3 py-1 bg-[#7C3AED]/20 rounded-full text-[#7C3AED] text-xs font-semibold uppercase tracking-wide mb-4">
              Ready to Order
            </div>

            <h2 className="text-2xl font-bold text-[#F8FAFC] mb-3">{recipe.recipe_name}</h2>

            {/* Media Preview - reduced height */}
            <div className="relative w-full h-40 rounded-xl overflow-hidden mb-4 shadow-md border border-[#7C3AED]/20">
              {recipe.image_url ? (
                <img src={recipe.image_url as string} alt={recipe.recipe_name} className="w-full h-full object-cover" />
              ) : /\.(png|jpe?g|webp|svg|gif)(\?|$)/i.test(recipe.video_url || "") ? (
                <img src={recipe.video_url as string} alt={recipe.recipe_name} className="w-full h-full object-cover" />
              ) : (
                <video src={recipe.video_url} className="w-full h-full object-cover" muted loop autoPlay>
                  <source src={recipe.video_url} />
                </video>
              )}
            </div>

            {/* Price Display */}
            <div className="mb-6">
              <p className="text-[#94A3B8] text-xs uppercase tracking-wide mb-1">Total Amount</p>
              <p className="text-4xl font-bold text-[#FACC15]">₹{recipe.price}</p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push("/payment")}
                className="w-full sm:flex-1 px-6 py-3 bg-[#7C3AED] hover:bg-[#8B5CF6] text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
              >
                Proceed to Payment
              </button>
              <button
                onClick={() => router.push("/products")}
                className="w-full sm:flex-1 px-6 py-3 bg-[#0F172A] text-[#F8FAFC] font-semibold rounded-xl border border-[#7C3AED]/30 transition-all hover:bg-[#7C3AED]/10"
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
