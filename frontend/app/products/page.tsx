"use client";

import React from "react";
import { useRouter } from "next/navigation";
import IdleTimer from "../components/IdleTimer";
import { setSelectedRecipe, logout } from "../components/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type Recipe = {
  recipe_name: string;
  price: number;
  video_url?: string;
};

type ApiRecipe = {
  recipe_name: string;
  price: number;
  video_url?: string | null;
};

const FALLBACK_RECIPES: Recipe[] = [
  {
    recipe_name: "Electric Citrus",
    price: 180,
    video_url: "/idle.mp4",
  },
  {
    recipe_name: "Velvet Mocha",
    price: 220,
    video_url: "/idle.mp4",
  },
  {
    recipe_name: "Berry Breeze",
    price: 160,
    video_url: "/idle.mp4",
  },
];

export default function ProductsPage() {
  const router = useRouter();
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
  const [isOfflineMenu, setIsOfflineMenu] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const mountedRef = React.useRef(true);
  const hasFetchedRef = React.useRef(false);

  const fetchRecipes = React.useCallback(async () => {
    if (!mountedRef.current) return;
    if (!hasFetchedRef.current) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    setStatusMessage(null);

    try {
      const res = await fetch(`${API_BASE}/recipes/`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = (await res.json()) as ApiRecipe[];
      if (!mountedRef.current) return;

      const mapped = data
        .filter((r) => r?.recipe_name)
        .map((r) => ({
          recipe_name: r.recipe_name,
          price: r.price,
          video_url: r.video_url || "/idle.mp4",
          ingredients: (r as any).ingredients || (r as any).recipe_ingredients || [],
        }));

      setRecipes(mapped);
      setIsOfflineMenu(false);
      setLastSyncedAt(new Date());
      setStatusMessage(
        mapped.length === 0
          ? "The kiosk connected to the backend but no drinks were returned. Add recipes from the owner dashboard to make them appear here."
          : null
      );
    } catch (e) {
      if (!mountedRef.current) return;
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(`Unable to reach the live menu at ${API_BASE}. ${message}`);
      setRecipes(FALLBACK_RECIPES);
      setIsOfflineMenu(true);
      setStatusMessage("Showing the built-in demo menu while the backend is unreachable.");
    } finally {
      if (!mountedRef.current) return;
      hasFetchedRef.current = true;
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    fetchRecipes();
    const interval = setInterval(fetchRecipes, 10000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchRecipes]);

  function handleSelect(recipe: Recipe) {
    setSelectedRecipe(recipe);
    router.push("/confirm");
  }

  return (
    <div className="min-h-[70vh] rounded-none bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl sm:rounded-3xl">
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
              onClick={fetchRecipes}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/40 border-t-white/90 rounded-full animate-spin" />
                  Refreshing…
                </>
              ) : (
                "Refresh"
              )}
            </button>
            <button
              onClick={() => router.push("/owner-login")}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-lg text-sm font-medium transition-all"
            >
              Owner Login
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mt-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-100 text-sm">
              <div>
                <p className="font-semibold">Live menu unavailable</p>
                <p className="text-red-100/80">{error}</p>
              </div>
              <button
                onClick={fetchRecipes}
                className="px-3 py-2 rounded-lg bg-red-500/30 hover:bg-red-500/40 text-xs font-semibold tracking-wide uppercase"
              >
                Retry now
              </button>
            </div>
          )}
          {!error && statusMessage && (
            <div
              className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                isOfflineMenu
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-50"
                  : "border-sky-500/40 bg-sky-500/10 text-sky-50"
              }`}
            >
              {statusMessage}
            </div>
          )}
          {lastSyncedAt && !isOfflineMenu && (
            <div className="mt-2 text-xs text-white/60">Last synced: {lastSyncedAt.toLocaleTimeString()}</div>
          )}
          {isOfflineMenu && (
            <div className="mt-2 text-xs text-amber-200/70">
              Backend check: Tap Refresh to retry the live database once it’s online.
            </div>
          )}
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
                        <p className="text-xs text-gray-400 mt-2">
                          {((r as any).ingredients || [])
                            .slice(0, 3)
                            .map((it: any) => (it.ingredient ? it.ingredient.name + ` ${it.amount_ml}ml` : (it.amount_ml ? `${it.amount_ml}ml` : "")))
                            .filter(Boolean)
                            .join(", ")}
                        </p>

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
