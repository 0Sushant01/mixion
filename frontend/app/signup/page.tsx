"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
      const res = await fetch(`${base}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        // backend may return errors keyed by `userid` or `username` or `detail`
        const msg = (data && (data.userid || (Array.isArray(data.username) ? data.username[0] : data.username) || data.detail)) || 'Registration failed';
        throw new Error(msg);
      }
      // Registration returned created customer object; store minimal session and redirect
      const created = await res.json();
      localStorage.setItem('current_customer', JSON.stringify(created));
      router.push('/buy');
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white/5 p-8 rounded-2xl">
        <h1 className="text-2xl font-semibold mb-4 text-center">Create Account</h1>
        <label className="block text-sm mb-2">Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mb-4 p-3 rounded bg-white/10 text-black" />
        <label className="block text-sm mb-2">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full mb-4 p-3 rounded bg-white/10 text-black" />
        <label className="block text-sm mb-2">Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full mb-4 p-3 rounded bg-white/10 text-black" />
        {error && <div className="text-red-400 mb-2">{error}</div>}
        <button disabled={loading} className="w-full py-3 rounded bg-indigo-600 font-semibold">{loading ? 'Creating...' : 'Create account'}</button>
      </form>
    </div>
  );
}
