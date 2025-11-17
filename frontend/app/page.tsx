"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { fetchRecipes } from "../lib/api";

type Recipe = {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  estimated_volume_ml: number;
};

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchRecipes()
      .then((data) => {
        if (mounted) setRecipes(data);
      })
      .catch((err) => {
        if (mounted) setError(String(err));
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/next.svg" alt="logo" width={80} height={20} />
          <h1 className="text-2xl font-semibold">Mixion Kiosk</h1>
        </div>
        <div>
          <a href="/owner" className="text-sm font-medium text-slate-700">Owner Login</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Products</h2>
          {error && <div className="text-red-600">{error}</div>}
          {!recipes && !error && <div>Loading…</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recipes && recipes.length === 0 && <div>No recipes available.</div>}
            {recipes &&
              recipes.map((r) => (
                <div key={r.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="h-36 w-full bg-zinc-100 mb-3 flex items-center justify-center">
                    <span className="text-sm text-zinc-400">Product image</span>
                  </div>
                  <h3 className="text-lg font-medium">{r.name}</h3>
                  <p className="text-sm text-zinc-600">{r.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">₹{(r.price_cents / 100).toFixed(2)}</div>
                    <button className="rounded-full bg-indigo-600 px-4 py-1 text-white">Buy</button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
