"use client";

import React from "react";
import { useRouter } from "next/navigation";
import IdleTimer from "../components/IdleTimer";
import { getCurrentCustomer, setSelectedRecipe, logout } from "../components/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type Recipe = {
  recipe_name: string;
  price: number;
  video_url?: string;
};

export default function ProductsPage() {
  const router = useRouter();
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const c = getCurrentCustomer();
    if (!c) return router.push("/login");

    let mounted = true;

    async function fetchRecipes() {
      try {
        const res = await fetch(`${API_BASE}/recipes/`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!mounted) return;
        // map backend fields to frontend shape
        const mapped = data.map((r: any) => ({
          recipe_name: r.recipe_name,
          price: r.price,
          video_url: r.video_url || "/idle.mp4",
        }));
        setRecipes(mapped);
      } catch (e) {
        console.error("Failed to load recipes", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // Initial fetch
    fetchRecipes();

    // Auto-refresh recipes every 10 seconds to get latest video URLs
    const interval = setInterval(fetchRecipes, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [router]);

  function handleSelect(recipe: any) {
    setSelectedRecipe(recipe);
    router.push("/confirm");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/10 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Select Your Drink</h1>
            <p className="text-gray-300 text-sm mt-1">Touch to choose</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-400">
              <IdleTimer onTimeout={() => logout((p) => router.push(p))} timeoutSeconds={15} />
            </div>
            <button
              onClick={() => logout((p) => router.push(p))}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition-all"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white/5 rounded-lg overflow-hidden animate-pulse">
                <div className="w-full h-56 bg-white/10" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && recipes.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No drinks available</p>
          </div>
        )}

        {!loading && recipes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((r) => (
              <div
                key={r.recipe_name}
                onClick={() => handleSelect(r)}
                className="group cursor-pointer bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-2xl overflow-hidden border border-white/10 hover:border-indigo-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/20"
              >
                {/* Video Container */}
                <div className="relative w-full h-56 overflow-hidden bg-gradient-to-br from-indigo-500/20 to-pink-500/20">
                  <video
                    src={r.video_url}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    muted
                    loop
                    autoPlay
                  >
                    <source src={r.video_url} />
                  </video>
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                </div>

                {/* Content */}
                <div className="p-6 relative">
                  <h3 className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {r.recipe_name}
                  </h3>
                  <p className="text-gray-400 text-sm mt-2">Handcrafted beverage</p>

                  {/* Price & CTA */}
                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Price</p>
                      <p className="text-3xl font-bold text-indigo-300 mt-1">₹{r.price}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(r);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/50 transition-all transform group-hover:translate-y-0 group-hover:scale-110"
                    >
                      Select
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        div {
          animation: slideIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
