"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import IdleTimer from "../../components/IdleTimer";
import { getCurrentCustomer, logout } from "../../components/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type Recipe = any;
type Bottle = { bottle_number: number; liquid_name: string };

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [owner, setOwner] = useState<any | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [dailyCounts, setDailyCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showBottleEditor, setShowBottleEditor] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; action?: (() => void) } | null>(null);

  useEffect(() => {
    const c = getCurrentCustomer();
    if (!c || c.role !== "owner") {
      router.push("/owner-login");
      return;
    }
    setOwner(c);
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [rRes, bRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/recipes/`),
        fetch(`${API_BASE}/bottles/`),
        fetch(`${API_BASE}/dailycounts/?range=today`),
      ]);
      const [rData, bData, dData] = await Promise.all([rRes.json(), bRes.json(), dRes.json()]);
      setRecipes(rData || []);
      setBottles(bData || []);
      setDailyCounts(dData || []);
    } catch (e) {
      console.error("Owner dashboard load failed", e);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: "success" | "error" | "info" = "info", action?: () => void) {
    setToast({ message, type, action });
    setTimeout(() => setToast(null), type === "error" ? 5000 : 4000);
  }

  function openAdd() {
    setEditingRecipe(null);
    setShowRecipeModal(true);
  }

  function openEdit(r: Recipe) {
    setEditingRecipe(r);
    setShowRecipeModal(true);
  }

  async function saveRecipe(payload: any, isNew = true) {
    try {
      const url = isNew ? `${API_BASE}/recipes/` : `${API_BASE}/recipes/${encodeURIComponent(payload.recipe_name)}/`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      showToast(isNew ? "Recipe created successfully" : "Recipe updated", "success");
      setShowRecipeModal(false);
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Failed to save recipe", "error");
    }
  }

  function deleteRecipeOptimistic(recipeName: string) {
    // remove locally and provide undo
    const prev = recipes;
    setRecipes(recipes.filter((r) => r.recipe_name !== recipeName));
    setDeleteConfirm(null);
    showToast(
      "Recipe deleted",
      "success",
      async () => {
        // undo: re-create by POSTing prev entry if available
        const orig = prev.find((p) => p.recipe_name === recipeName);
        if (orig) {
          try {
            await fetch(`${API_BASE}/recipes/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(orig),
            });
            showToast("Delete undone", "info");
            await loadAll();
          } catch (e) {
            showToast("Undo failed", "error");
          }
        }
      }
    );

    // schedule server delete after 5s finalization
    const t = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/recipes/${encodeURIComponent(recipeName)}/`, { method: "DELETE" });
      } catch (e) {
        setRecipes(prev);
        showToast("Server delete failed", "error");
      }
    }, 5000);
    // if user presses undo we expect action to POST back
  }

  async function openBottleEditor() {
    setShowBottleEditor(true);
    // bottles are already loaded
  }

  async function saveBottles(updated: Bottle[]) {
    // persist each changed bottle
    try {
      for (const b of updated) {
        await fetch(`${API_BASE}/bottles/${b.bottle_number}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liquid_name: b.liquid_name }),
        });
      }
      showToast("Bottles updated successfully", "success");
      setShowBottleEditor(false);
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Failed to update bottles", "error");
    }
  }

  const totalRevenue = dailyCounts.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Bar */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <div>
              <h1 className="text-xl font-bold text-white">MIXION Owner</h1>
              <p className="text-xs text-gray-300">{owner?.name || "Loading..."}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              + Add Recipe
            </button>
            <button
              onClick={() => setShowBottleEditor(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
            >
              🍾 Edit Bottles
            </button>
            <div className="text-xs text-gray-400">
              <IdleTimer onTimeout={() => { logout((p) => router.push(p)); }} timeoutSeconds={15} />
            </div>
            <button
              onClick={() => { logout((p) => router.push(p)); }}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recipes */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Recipes</h2>
              <p className="text-gray-400 text-sm">Manage your drink recipes and ingredients</p>
            </div>

            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-4 animate-pulse">
                    <div className="w-28 h-20 bg-white/10 rounded mb-3" />
                    <div className="h-4 bg-white/10 rounded mb-2 w-2/3" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {!loading && recipes.length === 0 && (
              <div className="bg-white/5 rounded-lg p-12 text-center">
                <p className="text-gray-400">No recipes yet. Create one to get started!</p>
              </div>
            )}

            {!loading && recipes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipes.map((r) => (
                  <div
                    key={r.recipe_name}
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 hover:border-indigo-500/30 transition-all group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-24 h-18 bg-gradient-to-br from-indigo-500/20 to-pink-500/20 rounded overflow-hidden flex-shrink-0">
                        {r.video_url ? (
                          <video src={r.video_url} className="w-full h-full object-cover" muted loop />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30">🎬</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg">{r.recipe_name}</h3>
                        <p className="text-indigo-300 text-lg font-bold">₹{r.price}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {Array.from({ length: 12 })
                            .map((_, i) => (r[`bottle_${i + 1}`] ? `${r[`bottle_${i + 1}`]}ml` : null))
                            .filter(Boolean)
                            .slice(0, 2)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(r)}
                        className="flex-1 px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded text-sm font-medium transition-all"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ name: r.recipe_name })}
                        className="flex-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-sm font-medium transition-all"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Analytics */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Today's Summary</h2>
              <p className="text-gray-400 text-sm">Real-time sales metrics</p>
            </div>

            <div className="space-y-3">
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30">
                <p className="text-green-300 text-sm font-medium">Sales Count</p>
                <p className="text-3xl font-bold text-white mt-1">{dailyCounts.length}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg p-4 border border-blue-500/30">
                <p className="text-blue-300 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-white mt-1">₹{totalRevenue}</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10 max-h-64 overflow-auto">
                <p className="text-white font-semibold text-sm mb-3">Recent Transactions</p>
                {dailyCounts.length === 0 ? (
                  <p className="text-gray-500 text-xs">No sales yet</p>
                ) : (
                  <div className="space-y-2">
                    {dailyCounts.slice(0, 8).map((d: any, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-gray-300 pb-2 border-b border-white/5">
                        <span>{new Date(d.timestamp).toLocaleTimeString()}</span>
                        <span className="text-emerald-400 font-medium">+₹{d.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 w-96 animate-in fade-in scale-in">
            <h3 className="text-xl font-bold text-white mb-2">Delete Recipe?</h3>
            <p className="text-gray-300 mb-4">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? You can undo this action for 5 seconds.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteRecipeOptimistic(deleteConfirm.name)}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {showRecipeModal && (
        <RecipeModal recipe={editingRecipe} onClose={() => setShowRecipeModal(false)} onSave={saveRecipe} />
      )}

      {/* Bottle Editor Modal */}
      {showBottleEditor && (
        <BottleEditor bottles={bottles} onClose={() => setShowBottleEditor(false)} onSave={saveBottles} />
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-right">
          <div className={`rounded-lg px-4 py-3 flex items-center gap-3 backdrop-blur-md border ${
            toast.type === "success"
              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
              : toast.type === "error"
              ? "bg-red-500/20 border-red-500/30 text-red-300"
              : "bg-blue-500/20 border-blue-500/30 text-blue-300"
          }`}>
            <span>
              {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{toast.message}</span>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action && toast.action();
                    setToast(null);
                  }}
                  className="text-xs font-semibold underline ml-2 hover:opacity-80"
                >
                  Undo
                </button>
              )}
            </div>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInFromRight {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function RecipeModal({ recipe, onClose, onSave }: any) {
  const isNew = !recipe;
  const [form, setForm] = useState<any>(() => {
    if (recipe) return { ...recipe };
    const base: any = { recipe_name: "", price: 10, video_url: "" };
    for (let i = 1; i <= 12; i++) base[`bottle_${i}`] = 0;
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function setField(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function submit() {
    const newErrors: string[] = [];
    if (!form.recipe_name.trim()) newErrors.push("Recipe name is required");
    const anyUsed = Array.from({ length: 12 }).some((_, i) => Number(form[`bottle_${i + 1}`]) > 0);
    if (!anyUsed) newErrors.push("At least one bottle must have ml > 0");
    if (Number(form.price) < 0) newErrors.push("Price must be >= 0");
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    await onSave(form, isNew);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-lg w-[min(900px,95%)] max-h-[90vh] overflow-auto">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-1">{isNew ? "Add Recipe" : "Edit Recipe"}</h3>
          <p className="text-gray-400 text-sm mb-6">Configure your drink recipe and ingredients</p>

          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
              {errors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm text-gray-300 font-medium">Recipe Name *</label>
              <input
                value={form.recipe_name}
                onChange={(e) => { setField("recipe_name", e.target.value); setErrors([]); }}
                className="mt-2 w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="e.g., Mojito"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 font-medium">Price (₹) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => { setField("price", Number(e.target.value)); setErrors([]); }}
                className="mt-2 w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-300 font-medium">Video URL</label>
              <input
                value={form.video_url}
                onChange={(e) => setField("video_url", e.target.value)}
                className="mt-2 w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="https://example.com/video.mp4"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-gray-300 font-medium mb-3 block">Bottle Volumes (ml) *</label>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i}>
                    <label className="text-xs text-gray-400">B{i + 1}</label>
                    <input
                      type="number"
                      className="mt-1 w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                      value={form[`bottle_${i + 1}`]}
                      onChange={(e) => { setField(`bottle_${i + 1}`, Number(e.target.value)); setErrors([]); }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 text-white rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Recipe"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottleEditor({ bottles, onClose, onSave }: any) {
  const [local, setLocal] = useState<Bottle[]>(() => bottles.map((b: any) => ({ ...b })));

  useEffect(() => { setLocal(bottles.map((b: any) => ({ ...b }))); }, [bottles]);

  function setName(idx: number, name: string) { setLocal((l) => l.map((it, i) => i === idx ? { ...it, liquid_name: name } : it)); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-lg w-[min(800px,95%)] max-h-[90vh] overflow-auto">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-1">Edit Bottle Slots</h3>
          <p className="text-gray-400 text-sm mb-6">Assign liquids to each bottle position</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {local.map((b, i) => (
              <div key={b.bottle_number} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <label className="text-xs text-gray-400 font-medium">Slot {b.bottle_number}</label>
                <input
                  className="mt-2 w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                  value={b.liquid_name}
                  onChange={(e) => setName(i, e.target.value)}
                  placeholder="e.g., Mango juice"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(local)}
              className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 text-white rounded-lg font-medium transition-all"
            >
              Save Bottles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
