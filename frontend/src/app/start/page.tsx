"use client";

import { useNavigate } from "react-router-dom";

export default function Start() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white p-6">
      <main className="w-full max-w-md">
        <div className="bg-white/6 backdrop-blur-sm rounded-2xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome</h1>
          <p className="text-sm text-white/70 mb-6">Please choose how you&apos;d like to proceed</p>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate('/products')}
              className="w-full py-3 rounded-xl bg-white text-zinc-900 font-semibold text-lg"
            >
              Browse Drinks
            </button>

            <button
              onClick={() => navigate('/owner-login')}
              className="w-full py-3 rounded-xl bg-transparent border border-white/20 text-white font-semibold text-lg"
            >
              Owner Login
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full py-2 rounded-xl bg-transparent text-sm text-white/60 mt-4"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
