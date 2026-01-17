"use client";

import React from "react";
import { useNavigate } from "react-router-dom";

export default function BottomNav() {
  const navigate = useNavigate();

  return (
    <div className="fixed left-0 right-0 bottom-16 z-50 flex items-center justify-center">
      <nav className="w-full max-w-3xl mx-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md p-2 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            // prefer navigate(-1) but fallback to /products
            try {
              navigate(-1);
            } catch {
              navigate("/products");
            }
          }}
          className="flex-1 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          ← Back
        </button>

        <button
          onClick={() => navigate("/")}
          className="flex-1 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          Home
        </button>

        <button
          onClick={() => navigate("/products")}
          className="flex-1 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          Products
        </button>

        <button
          onClick={() => navigate("/owner")}
          className="flex-1 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          Owner
        </button>

        <button
          onClick={() => navigate("/owner/ingredients")}
          className="flex-1 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          Ingredients
        </button>
      </nav>
    </div>
  );
}
