"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import IdleTimer from "../components/IdleTimer";
import { getSelectedRecipe, logout, SessionRecipe } from "../components/session";

export default function ConfirmPage() {
  const navigate = useNavigate();
  const [recipe, setRecipe] = React.useState<SessionRecipe | null>(null);

  React.useEffect(() => {
    const r = getSelectedRecipe();
    if (!r) {
      navigate("/products");
      return;
    }
    setRecipe(r);
  }, [navigate]);

  if (!recipe) return null;

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/60 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Confirm Your Selection</h1>
            <p className="text-slate-600 text-sm mt-1">Review before proceeding</p>
          </div>
          <div className="text-xs text-slate-500">
            <IdleTimer onTimeout={() => logout((p) => navigate(p))} timeoutSeconds={15} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl bg-white/60 backdrop-blur-lg rounded-3xl border border-gray-200 p-8 shadow-sm animate-fadeIn">
          {/* Recipe Card */}
          <div className="text-center">
            <div className="inline-block px-4 py-1 bg-indigo-100 rounded-full text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-6">
              Ready to Order
            </div>

            <h2 className="text-5xl font-bold text-slate-900 mb-4">{recipe.recipe_name}</h2>

            {/* Media Preview */}
            <div className="relative w-full h-72 rounded-2xl overflow-hidden mb-8 shadow-md border border-gray-100">
              {recipe.image_url ? (
                <img src={recipe.image_url as string} alt={recipe.recipe_name} className="w-full h-full object-cover" />
              ) : /\.(png|jpe?g|webp|svg|gif)(\?|$)/i.test(recipe.video_url || "") ? (
                <img src={recipe.video_url as string} alt={recipe.recipe_name} className="w-full h-full object-cover" />
              ) : (
                <video src={recipe.video_url} className="w-full h-full object-cover" muted loop autoPlay>
                  <source src={recipe.video_url} />
                </video>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent opacity-40" />
            </div>

            {/* Price Display */}
            <div className="mb-8">
              <p className="text-slate-500 text-sm uppercase tracking-wide mb-2">Total Amount</p>
              <p className="text-6xl font-bold text-indigo-600">₹{recipe.price}</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate("/payment")}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-105"
              >
                Proceed to Payment
              </button>
              <button
                onClick={() => navigate("/products")}
                className="flex-1 px-6 py-4 bg-white text-slate-800 font-semibold rounded-xl border border-gray-200 transition-all hover:shadow-sm"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
