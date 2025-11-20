"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type SalesDailyCount = {
  id: number;
  timestamp: string;
  recipe: string | null;
  customer: string | null;
  amount: number;
  machine: string | { machine_id: string; label?: string } | null;
};

type SalesRecipe = {
  recipe_name: string;
};

type SalesMachine = {
  machine_id: string;
  label?: string;
};

export default function SalesDetailsPage() {
  const router = useRouter();
  const [dailyCounts, setDailyCounts] = useState<SalesDailyCount[]>([]);
  const [recipes, setRecipes] = useState<SalesRecipe[]>([]);
  const [machines, setMachines] = useState<SalesMachine[]>([]);
  const [salesFilterRecipe, setSalesFilterRecipe] = useState("");
  const [salesFilterMachine, setSalesFilterMachine] = useState("");
  const [salesFilterCustomer, setSalesFilterCustomer] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [dRes, rRes, mRes] = await Promise.all([
          fetch(`${API_BASE}/dailycounts/`),
          fetch(`${API_BASE}/recipes/`),
          fetch(`${API_BASE}/machines/`),
        ]);
        setDailyCounts(await dRes.json());
        setRecipes(await rRes.json());
        setMachines(await mRes.json());
      } catch (e) {}
      setLoading(false);
    }
    loadAll();
  }, []);

  const filtered = dailyCounts.filter((d) => {
    if (salesFilterRecipe && d.recipe !== salesFilterRecipe) return false;
    if (salesFilterMachine) {
      const mval = typeof d.machine === "string"
        ? d.machine
        : d.machine && typeof d.machine === "object" && "machine_id" in d.machine
        ? d.machine.machine_id
        : "";
      if (mval !== salesFilterMachine) return false;
    }
    if (salesFilterCustomer) {
      const cname = d.customer ? String(d.customer) : "";
      if (!cname.toLowerCase().includes(salesFilterCustomer.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#0e7490] text-white px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-5xl mx-auto">
        <div className="sticky top-0 z-10 mb-8">
          <div className="backdrop-blur-lg bg-white/10 border border-cyan-400/30 rounded-2xl shadow-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in">
            <div>
              <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-cyan-300 via-emerald-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">Sales Details</h1>
              <p className="text-gray-300 text-lg font-medium">All sales transactions with advanced filters and analytics.</p>
            </div>
            <button onClick={() => router.back()} className="px-6 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-bold shadow-lg hover:scale-105 transition-transform">← Back</button>
          </div>
        </div>

        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 text-cyan-300">Recipe</label>
              <select
                value={salesFilterRecipe}
                onChange={(e) => setSalesFilterRecipe(e.target.value)}
                className="px-4 py-2 bg-white/10 rounded-xl border border-cyan-400/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="">-- All Recipes --</option>
                {recipes.map((r) => (
                  <option key={r.recipe_name} value={r.recipe_name}>{r.recipe_name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 text-cyan-300">Machine</label>
              <select
                value={salesFilterMachine}
                onChange={(e) => setSalesFilterMachine(e.target.value)}
                className="px-4 py-2 bg-white/10 rounded-xl border border-cyan-400/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="">-- All Machines --</option>
                {machines.map((m) => (
                  <option key={m.machine_id} value={m.machine_id}>{m.label || m.machine_id}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 text-cyan-300">Customer</label>
              <input
                placeholder="Customer name contains..."
                value={salesFilterCustomer}
                onChange={(e) => setSalesFilterCustomer(e.target.value)}
                className="px-4 py-2 bg-white/10 rounded-xl border border-cyan-400/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-cyan-400/20 bg-white/10 shadow-2xl">
          <table className="min-w-full text-base">
            <thead>
              <tr className="bg-gradient-to-r from-cyan-900/40 to-emerald-900/40 text-cyan-200">
                <th className="p-4 text-left font-bold">🕒 Time</th>
                <th className="p-4 text-left font-bold">🍹 Recipe</th>
                <th className="p-4 text-left font-bold">👤 Customer</th>
                <th className="p-4 text-left font-bold">🖥️ Machine</th>
                <th className="p-4 text-right font-bold">💸 Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-cyan-300 animate-pulse">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-cyan-300">No sales found</td></tr>
              ) : (
                filtered.map((d, idx) => (
                  <tr key={d.id ?? idx} className={`border-b border-cyan-400/10 ${idx % 2 === 0 ? 'bg-cyan-900/10' : 'bg-emerald-900/10'} hover:bg-cyan-800/20 transition-all`}>
                    <td className="p-4 font-mono text-cyan-100">{new Date(d.timestamp).toLocaleString()}</td>
                    <td className="p-4 font-semibold text-emerald-200">{d.recipe || '-'}</td>
                    <td className="p-4 text-cyan-100">{d.customer || '-'}</td>
                    <td className="p-4 text-cyan-200">{typeof d.machine === 'string' ? d.machine : (d.machine && typeof d.machine === 'object' && 'machine_id' in d.machine ? d.machine.machine_id : '-') }</td>
                    <td className="p-4 text-right text-emerald-300 font-extrabold text-lg">+₹{d.amount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-12 flex items-center justify-center">
          <span className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 text-cyan-100 font-semibold shadow-lg backdrop-blur-lg">Total Sales: <span className="text-emerald-300 font-bold">{filtered.length}</span></span>
        </div>
      </div>
    </main>
  );
}
