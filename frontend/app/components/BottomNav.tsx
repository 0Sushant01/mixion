"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();

  return (
    <div className="fixed left-0 right-0 bottom-16 z-50 flex items-center justify-center">
      <nav className="w-full max-w-3xl mx-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md p-2 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            // prefer router.back but fallback to /products
            try {
              router.back();
            } catch {
              router.push("/products");
            }
          }}
          className="flex-1 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          ← Back
        </button>

        <button
          onClick={() => router.push("/")}
          className="flex-1 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          Home
        </button>

        <button
          onClick={() => router.push("/products")}
          className="flex-1 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          Products
        </button>

        <button
          onClick={() => router.push("/owner")}
          className="flex-1 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          Owner
        </button>

        <button
          onClick={() => router.push("/owner/ingredients")}
          className="flex-1 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          Ingredients
        </button>
      </nav>
    </div>
  );
}
