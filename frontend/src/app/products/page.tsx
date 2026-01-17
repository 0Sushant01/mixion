"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import IdleTimer from "../components/IdleTimer";
import { setSelectedRecipe, logout } from "../components/session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

type Recipe = {
  recipe_name: string;
  price: number;
  video_url?: string;
  image_url?: string;
};

type ApiRecipe = {
  recipe_name: string;
  price: number;
  video_url?: string | null;
  image_url?: string | null;
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
  const navigate = useNavigate();
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
        .map((r) => {
          // Some installs may store a static image URL in `video_url` (admin-entered).
          // If `video_url` points to an image file, prefer it as `image_url`.
          const possibleVideo = r.video_url || "";
          const looksLikeImage = /\.(png|jpe?g|webp|svg|gif)(\?|$)/i.test(possibleVideo);
          const explicitImage = (r as any).image_url || (r as any).image || null;
          return {
            recipe_name: r.recipe_name,
            price: r.price,
            image_url: explicitImage || (looksLikeImage ? possibleVideo : null),
            video_url: (!looksLikeImage && r.video_url) ? r.video_url : "/idle.mp4",
            ingredients: (r as any).ingredients || (r as any).recipe_ingredients || [],
          };
        });

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
    navigate("/confirm");
  }

  // number of columns to show on wide screens (1..3)
  const cols = Math.min(3, Math.max(1, recipes.length || 1));

  return (
    <div className="fixed inset-0 h-screen w-screen bg-white text-slate-900 overflow-auto">
      {/* Header - overlayed, minimal and transparent */}
      <header className="absolute top-0 left-0 right-0 h-20 z-40 flex items-center justify-between px-8 backdrop-blur-md bg-white/60 border-b border-gray-200">
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">Select Your Drink</h1>
          <p className="text-sm text-slate-600 mt-1">Handcrafted. Premium. MIXION.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-white/40">
            <IdleTimer onTimeout={() => logout((p) => navigate(p))} timeoutSeconds={15} />
          </div>
          <button
            onClick={fetchRecipes}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-sm font-medium transition-all border border-gray-200 shadow-sm"
          >
            {isRefreshing ? <span className="animate-spin h-3 w-3 border-2 border-slate-300 border-t-slate-700 rounded-full" /> : "Refresh"}
          </button>
          <button
            onClick={() => navigate('/owner-login')}
            className="px-3 py-2 bg-transparent hover:bg-white/6 text-white rounded-xl text-sm font-medium transition-all border border-white/6"
          >
            Owner Login
          </button>
        </div>
      </header>

      <main className="w-full h-full p-0 pt-20">
        {/* compute columns dynamically: max 3 columns on large screens, but adapt when there are fewer recipes */}
        {loading && (
          <div className="w-full h-full p-6 box-border">
            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: `repeat(${Math.min(3, 3)}, minmax(0, 1fr))` }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-3xl overflow-hidden animate-pulse bg-slate-50 border border-gray-200 shadow-sm h-96">
                  <div className="w-full h-2/3 bg-slate-100" />
                  <div className="p-6 space-y-4">
                    <div className="h-5 bg-slate-100 rounded w-2/3" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && recipes.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No drinks available</p>
          </div>
        )}

        {!loading && recipes.length > 0 && (
          <div className="w-full h-full p-6 box-border">
            <div
              style={{
                display: "grid",
                gap: "1.25rem",
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                alignContent: "start",
              }}
            >
              {recipes.map((r) => (
                <article
                  key={r.recipe_name}
                  onClick={() => handleSelect(r)}
                  className="group cursor-pointer rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1"
                >
                  {/* Media */}
                  <div className="relative w-full h-60 md:h-64 lg:h-72 overflow-hidden bg-slate-50">
                    {((r as any).image_url) ? (
                      <img
                        src={(r as any).image_url}
                        alt={r.recipe_name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : /\.(png|jpe?g|webp|svg|gif)(\?|$)/i.test(r.video_url || "") ? (
                      <img
                        src={r.video_url}
                        alt={r.recipe_name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <video
                        src={r.video_url}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        muted
                        loop
                        autoPlay
                      />
                    )}

                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-4 left-6 w-44 h-24 rounded-full bg-white/40 blur-2xl opacity-20 transform -rotate-12" />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{r.recipe_name}</h3>
                      <p className="text-xs text-slate-500 mt-3">
                        {((r as any).ingredients || [])
                          .slice(0, 3)
                          .map((it: any) => (it.ingredient ? it.ingredient.name + ` ${it.amount_ml}ml` : it.amount_ml ? `${it.amount_ml}ml` : ""))
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Price</p>
                        <p className="text-4xl font-extrabold text-indigo-700 mt-1">₹{r.price}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(r);
                        }}
                        className="relative px-8 py-3 rounded-full text-white font-semibold bg-gradient-to-r from-indigo-500 to-pink-500 shadow-[0_18px_40px_rgba(99,102,241,0.14)] transition-all transform hover:scale-105"
                        aria-label={`Select ${r.recipe_name}`}
                      >
                        <span className="absolute inset-0 rounded-full opacity-20 blur-xl mix-blend-screen" />
                        <span className="relative z-10">Select</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
