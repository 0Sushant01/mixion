"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params?.get("role") || "customer";
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
      // store simple session (customer object)
      localStorage.setItem("current_customer", JSON.stringify(data));
      router.push("/buy");
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white/5 p-8 rounded-2xl">
        <h1 className="text-2xl font-semibold mb-4 text-center">{role === 'owner' ? 'Owner Login' : 'Customer Login'}</h1>
        <label className="block text-sm mb-2">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mb-4 p-3 rounded bg-white/10" />
        <label className="block text-sm mb-2">Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full mb-4 p-3 rounded bg-white/10" />
        {error && <div className="text-red-400 mb-2">{error}</div>}
        <button disabled={loading} className="w-full py-3 rounded bg-indigo-600 font-semibold">{loading ? 'Signing in...' : 'Sign in'}</button>
        <div className="mt-4 text-center">
          <a href="/signup" className="text-sm text-white/80 underline">Create account</a>
        </div>
      </form>
    </div>
  );
}
