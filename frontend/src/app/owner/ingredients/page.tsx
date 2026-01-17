"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import IdleTimer from "../../components/IdleTimer";
import { getCurrentCustomer, logout } from "../../components/session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

type Ingredient = { id: number; name: string; is_cold: boolean };

export default function IngredientsPage() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [isCold, setIsCold] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" } | null>(null);

  useEffect(() => {
    const c = getCurrentCustomer();
    if (!c || c.role !== "owner") {
      navigate("/owner-login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ingredients/`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setIngredients((data || []).map((it: any) => ({ id: it.id, name: it.name, is_cold: !!it.is_cold })));
    } catch (err) {
      console.error(err);
      showToast("Unable to load ingredients", "error");
    } finally {
      setLoading(false);
    }
  }

  async function createOrUpdate(e?: React.FormEvent) {
    e?.preventDefault();
    const payload = { name: name.trim(), is_cold: isCold };
    if (!payload.name) return showToast("Name is required", "error");
    try {
      if (editing) {
        const res = await fetch(`${API_BASE}/ingredients/${editing.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        showToast("Ingredient updated");
      } else {
        const res = await fetch(`${API_BASE}/ingredients/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        showToast("Ingredient created");
      }
      setName("");
      setIsCold(false);
      setEditing(null);
      await load();
    } catch (err: any) {
      console.error(err);
      showToast("Save failed", "error");
    }
  }

  function startEdit(it: Ingredient) {
    setEditing(it);
    setName(it.name);
    setIsCold(it.is_cold);
  }

  async function remove(it: Ingredient) {
    if (!confirm(`Delete ingredient '${it.name}'?`)) return;
    try {
      const res = await fetch(`${API_BASE}/ingredients/${it.id}/`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      showToast("Deleted");
      await load();
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "error");
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="bg-white/60 backdrop-blur-md border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Manage Ingredients</h1>
            <p className="text-sm text-slate-600">Create and categorize ingredients (cold vs normal)</p>
          </div>
          <div className="flex items-center gap-3">
            <IdleTimer
              onTimeout={() => logout({ navigate: (p) => navigate(p), destination: "/owner-login" })}
              timeoutSeconds={30}
            />
            <button className="px-3 py-2 bg-white border border-gray-200 rounded text-slate-700" onClick={() => navigate('/owner/dashboard')}>Back</button>
            <button
              className="px-3 py-2 bg-white border border-gray-200 rounded text-red-600"
              onClick={() => logout({ navigate: (p) => navigate(p), destination: "/owner-login" })}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <form onSubmit={createOrUpdate} className="bg-white/60 p-4 rounded mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Name</label>
              <input className="mt-1 w-full p-2 bg-white border border-gray-200 rounded text-slate-700" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-700">Cold?</label>
              <input type="checkbox" checked={isCold} onChange={(e) => setIsCold(e.target.checked)} />
              <div className="flex-1 text-right">
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded ml-2">{editing ? "Update" : "Create"}</button>
                {editing && (
                  <button type="button" onClick={() => { setEditing(null); setName(""); setIsCold(false); }} className="ml-2 px-3 py-2 bg-white border border-gray-200 rounded text-slate-700">Cancel</button>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="bg-white/60 rounded border border-gray-100 p-4">
          <h2 className="font-semibold mb-3 text-slate-900">Ingredients</h2>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-2">
              {ingredients.length === 0 && <div className="text-slate-600">No ingredients yet.</div>}
              {ingredients.map((it) => (
                <div key={it.id} className="flex items-center justify-between p-3 bg-white/50 rounded border border-gray-100">
                  <div>
                    <div className="font-medium text-slate-900">{it.name}</div>
                    <div className="text-xs text-slate-600">{it.is_cold ? "Cold" : "Normal"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(it)} className="px-3 py-1 bg-white border border-gray-200 rounded text-slate-700">Edit</button>
                    <button onClick={() => remove(it)} className="px-3 py-1 bg-red-500/20 rounded text-red-600">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {toast && (
          <div className={`fixed bottom-6 right-6 rounded px-4 py-2 ${toast.type === "error" ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
            {toast.msg}
          </div>
        )}
      </main>
    </div>
  );
}
