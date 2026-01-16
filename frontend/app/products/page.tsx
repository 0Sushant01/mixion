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
    router.push("/confirm");
  }

  // number of columns to show on wide screens (1..3)
  const cols = Math.min(3, Math.max(1, recipes.length || 1));

  return (
    <div
      className="full-page-overlay fixed inset-0 z-[9999] h-screen w-screen bg-[#0F172A] text-[#F8FAFC] overflow-auto"
      style={{ isolation: 'isolate', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Header - overlayed, minimal and transparent */}
      <header className="absolute top-0 left-0 right-0 h-16 z-40 flex items-center justify-between px-6 backdrop-blur-md bg-[#1E293B]/90 border-b border-[#7C3AED]/20">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-bold text-[#F8FAFC] tracking-tight leading-tight">Select Your Drink</h1>
          <p className="text-xs text-[#94A3B8]">Handcrafted. Premium. MIXION.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-[#94A3B8]">
            <IdleTimer onTimeout={() => logout((p) => router.push(p))} timeoutSeconds={15} />
          </div>
          <button
            onClick={fetchRecipes}
            className="px-3 py-2 bg-[#1E293B] hover:bg-[#7C3AED]/20 text-[#F8FAFC] rounded-xl text-sm font-medium transition-all border border-[#7C3AED]/30 shadow-sm"
          >
            {isRefreshing ? <span className="animate-spin h-3 w-3 border-2 border-[#7C3AED]/30 border-t-[#7C3AED] rounded-full" /> : "Refresh"}
          </button>
          <button
            onClick={() => router.push('/owner-login')}
            className="px-3 py-2 bg-[#7C3AED]/20 hover:bg-[#7C3AED]/30 text-[#7C3AED] rounded-xl text-sm font-medium transition-all border border-[#7C3AED]/30"
          >
            Owner Login
          </button>
        </div>
      </header>

      <main className="w-full h-full p-0 pt-16">
        {/* compute columns dynamically: max 3 columns on large screens, but adapt when there are fewer recipes */}
        {loading && (
          <div className="w-full h-full p-6 box-border">
            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: `repeat(${Math.min(3, 3)}, minmax(0, 1fr))` }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-3xl overflow-hidden animate-pulse bg-[#1E293B] border border-[#7C3AED]/20 shadow-sm h-96">
                  <div className="w-full h-2/3 bg-[#0F172A]" />
                  <div className="p-6 space-y-4">
                    <div className="h-5 bg-[#0F172A] rounded w-2/3" />
                    <div className="h-4 bg-[#0F172A] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && recipes.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#94A3B8] text-lg">No drinks available</p>
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
                  className="group cursor-pointer rounded-3xl overflow-hidden border border-[#7C3AED]/20 bg-[#1E293B] shadow-lg transition-transform duration-300 hover:-translate-y-1"
                >
                  {/* Media */}
                  <div className="relative w-full h-40 md:h-48 lg:h-52 overflow-hidden bg-[#0F172A]">
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
                  <div className="p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-[#F8FAFC] tracking-tight">{r.recipe_name}</h3>
                      <p className="text-xs text-[#94A3B8] mt-3">
                        {((r as any).ingredients || [])
                          .slice(0, 3)
                          .map((it: any) => (it.ingredient ? it.ingredient.name + ` ${it.amount_ml}ml` : it.amount_ml ? `${it.amount_ml}ml` : ""))
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#94A3B8] uppercase tracking-wider">Price</p>
                        <p className="text-2xl font-bold text-[#FACC15]">₹{r.price}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(r);
                        }}
                        className="relative px-5 py-2 rounded-full text-white text-sm font-medium bg-[#7C3AED] hover:bg-[#8B5CF6] shadow-md transition-all transform hover:scale-105"
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
