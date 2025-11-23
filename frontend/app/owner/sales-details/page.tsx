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
  const [salesFilterDate, setSalesFilterDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll(date?: string) {
      setLoading(true);
      try {
        const dcUrl = date ? `${API_BASE}/dailycounts/?date=${encodeURIComponent(date)}` : `${API_BASE}/dailycounts/`;
        const [dRes, rRes, mRes] = await Promise.all([
          fetch(dcUrl),
          fetch(`${API_BASE}/recipes/`),
          fetch(`${API_BASE}/machines/`),
        ]);
        setDailyCounts(await dRes.json());
        setRecipes(await rRes.json());
        setMachines(await mRes.json());
      } catch (e) {
        console.error("Failed to load sales details", e);
      }
      setLoading(false);
    }
    // load initially (all data)
    loadAll(salesFilterDate || undefined);
    // re-run when date filter changes
  }, [salesFilterDate]);

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
    return true;
  });

  return (
    <main className="min-h-screen bg-white text-slate-900 px-6 py-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="sticky top-0 z-10 mb-8">
          <div className="backdrop-blur-md bg-white/60 border border-gray-200 rounded-2xl shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold mb-1 text-slate-900">Sales Details</h1>
              <p className="text-slate-600 text-base">All sales transactions with advanced filters and analytics.</p>
            </div>
            <button onClick={() => router.back()} className="px-5 py-2 rounded-full bg-indigo-600 text-white font-bold shadow-sm hover:scale-105 transition-transform">← Back</button>
          </div>
        </div>

          <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 text-slate-700">Recipe</label>
              <select
                value={salesFilterRecipe}
                onChange={(e) => setSalesFilterRecipe(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-slate-700 focus:outline-none"
              >
                <option value="">-- All Recipes --</option>
                {recipes.map((r) => (
                  <option key={r.recipe_name} value={r.recipe_name}>{r.recipe_name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 text-slate-700">Machine</label>
              <select
                value={salesFilterMachine}
                onChange={(e) => setSalesFilterMachine(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-slate-700 focus:outline-none"
              >
                <option value="">-- All Machines --</option>
                {machines.map((m) => (
                  <option key={m.machine_id} value={m.machine_id}>{m.label || m.machine_id}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 text-slate-700">Date</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={salesFilterDate}
                  onChange={(e) => setSalesFilterDate(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-slate-700 focus:outline-none"
                />
                {salesFilterDate ? (
                  <button
                    onClick={() => setSalesFilterDate("")}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-slate-700"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white/60 shadow-sm">
          <table className="min-w-full text-base">
            <thead>
              <tr className="bg-gray-100 text-slate-700">
                <th className="p-4 text-left font-semibold">Time</th>
                <th className="p-4 text-left font-semibold">Recipe</th>
                <th className="p-4 text-left font-semibold">Machine</th>
                <th className="p-4 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-600 animate-pulse">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-600">No sales found</td></tr>
              ) : (
                filtered.map((d, idx) => (
                  <tr key={d.id ?? idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-all`}>
                    <td className="p-4 font-mono text-slate-700">{new Date(d.timestamp).toLocaleString()}</td>
                    <td className="p-4 font-semibold text-slate-900">{d.recipe || '-'}</td>
                    <td className="p-4 text-slate-700">{typeof d.machine === 'string' ? d.machine : (d.machine && typeof d.machine === 'object' && 'machine_id' in d.machine ? d.machine.machine_id : '-') }</td>
                    <td className="p-4 text-right text-indigo-700 font-extrabold text-lg">₹{d.amount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-12 flex items-center justify-center">
          <span className="px-6 py-3 rounded-xl bg-white/60 border border-gray-100 text-slate-700 font-semibold shadow-sm">Total Sales: <span className="text-slate-900 font-bold">{filtered.length}</span></span>
        </div>
      </div>
    </main>
  );
}
