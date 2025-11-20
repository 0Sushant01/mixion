"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api"}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Login failed");
      }
      const data = await res.json();
      // store simple session object
      localStorage.setItem("current_customer", JSON.stringify(data));
      // navigate to owner area; backend should enforce owner permissions
      router.push('/owner/dashboard');
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1112] text-white p-6">
      <div className="w-full max-w-3xl px-6">
        <div className="flex justify-center">
          <div className="w-full max-w-lg bg-[#161619] border border-white/8 rounded-2xl p-10 shadow-xl">
            <h1 className="text-3xl font-extrabold mb-6 text-center">Owner Login</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-gray-300">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded bg-slate-100/10 border border-white/6 placeholder-gray-400 text-white"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-300">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="w-full p-3 rounded bg-slate-100/10 border border-white/6 placeholder-gray-400 text-white"
                  placeholder="••••••••"
                />
              </div>

              {error && <div className="text-red-400">{error}</div>}

              <div>
                <button
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition font-semibold text-white text-lg"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* bottom home button */}
      <div className="fixed left-0 right-0 bottom-6 flex items-center justify-center pointer-events-auto">
        <a
          href="/"
          className="px-6 py-3 bg-white/6 backdrop-blur-md border border-white/10 rounded-full text-white font-medium hover:bg-white/10 transition"
        >
          Home
        </a>
      </div>
    </div>
  );
}
