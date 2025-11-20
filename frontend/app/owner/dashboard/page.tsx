"use client";

import React, { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import IdleTimer from "../../components/IdleTimer";
import { getCurrentCustomer, logout } from "../../components/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type BottleFieldKey =
  | "bottle_1"
  | "bottle_2"
  | "bottle_3"
  | "bottle_4"
  | "bottle_5"
  | "bottle_6"
  | "bottle_7"
  | "bottle_8"
  | "bottle_9"
  | "bottle_10"
  | "bottle_11"
  | "bottle_12";

type RecipeForm = {
  recipe_name: string;
  price: number;
  video_url: string;
} & Record<BottleFieldKey, number>;

type Recipe = RecipeForm & Record<string, unknown>;

type Bottle = { id?: number; bottle_number: number; liquid_name: string; machine?: string | null };

type OwnerUser = { name?: string; role?: string } & Record<string, unknown>;
type DailyCount = { timestamp: string; amount: number };

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [owner, setOwner] = useState<OwnerUser | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [machines, setMachines] = useState<{ id: number; machine_id: string; label?: string }[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [ingredientsList, setIngredientsList] = useState<{ id: number; name: string; is_cold: boolean }[]>([]);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesFilterRecipe, setSalesFilterRecipe] = useState<string | null>(null);
  const [salesFilterMachine, setSalesFilterMachine] = useState<string | null>(null);
  const [salesFilterCustomer, setSalesFilterCustomer] = useState<string | null>(null);
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
      // fetch machines and ingredients in parallel; bottles may be fetched filtered by machine
      const iResP = fetch(`${API_BASE}/ingredients/`);
      const mResP = fetch(`${API_BASE}/machines/`);

      const [rData, bData, dData, iRes, mRes] = await Promise.all([
        rRes.json() as Promise<Recipe[]>,
        bRes.json() as Promise<Bottle[]>,
        dRes.json() as Promise<DailyCount[]>,
        iResP,
        mResP,
      ]);
      const iRaw = await iRes.json();
      const mRaw = await mRes.json();
      const iData = (iRaw || []).map((it: any) => ({ id: it.id, name: it.name, is_cold: !!it.is_cold }));
      const mData = (mRaw || []).map((it: any) => ({ id: it.id, machine_id: it.machine_id, label: it.label }));
      setRecipes(rData || []);
      setBottles(bData || []);
      setDailyCounts(dData || []);
      setIngredientsList(iData || []);
      setMachines(mData || []);
      // if there's at least one machine and none selected, pick the first and reload bottles
      if (mData && mData.length > 0 && !selectedMachine) {
        const first = mData[0];
        setSelectedMachine(first.machine_id);
        // refetch bottles filtered by this machine
        try {
          const filtered = await fetch(`${API_BASE}/bottles/?machine=${encodeURIComponent(first.machine_id)}`);
          const bFilt = await filtered.json();
          setBottles(bFilt || []);
        } catch (err) {
          console.error("Failed to fetch bottles for machine", err);
        }
      }
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

  async function saveRecipe(payload: RecipeForm, isNew = true) {
    try {
      const url = isNew ? `${API_BASE}/recipes/` : `${API_BASE}/recipes/${encodeURIComponent(payload.recipe_name)}/`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("save failed");
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
          } catch (err) {
            console.error("Undo failed", err);
            showToast("Undo failed", "error");
          }
        }
      }
    );

    // schedule server delete after 5s finalization
    setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/recipes/${encodeURIComponent(recipeName)}/`, { method: "DELETE" });
      } catch (err) {
        console.error("Delete failed", err);
        setRecipes(prev);
        showToast("Server delete failed", "error");
      }
    }, 5000);
    // if user presses undo we expect action to POST back
  }

  async function saveBottles(updated: Bottle[]) {
    try {
      await Promise.all(
        updated.map(async (b) => {
          // If the slot already exists on the server (has an id) PATCH it.
          // Otherwise create it (POST) for the currently selected machine.
          if ((b as any).id) {
            const pk = (b as any).id;
            const res = await fetch(`${API_BASE}/bottles/${pk}/`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ liquid_name: b.liquid_name }),
            });
            if (!res.ok) {
              const txt = await res.text();
              throw new Error(txt || `Bottle ${b.bottle_number} update failed`);
            }
          } else {
            // need a selected machine to create a slot
            if (!selectedMachine) {
              throw new Error(`No machine selected for creating bottle ${b.bottle_number}`);
            }
            const res = await fetch(`${API_BASE}/bottles/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bottle_number: b.bottle_number, liquid_name: b.liquid_name, machine: selectedMachine }),
            });
            if (!res.ok) {
              const txt = await res.text();
              throw new Error(txt || `Bottle ${b.bottle_number} create failed`);
            }
          }
        })
      );
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
    <div className="min-h-[70vh] rounded-none bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#0e7490] shadow-2xl sm:rounded-3xl animate-in fade-in">
      {/* Header Bar */}
      <header className="bg-gradient-to-r from-cyan-900/40 to-emerald-900/40 backdrop-blur-xl border-b border-cyan-400/20 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-lg">M</div>
            <div>
              <h1 className="text-2xl font-extrabold text-cyan-200 drop-shadow">MIXION Owner</h1>
              <p className="text-xs text-cyan-100/80">{owner?.name || "Loading..."}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openAdd}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-transform"
            >
              + Add Recipe
            </button>
            <button
              onClick={() => router.push('/owner/ingredients')}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-100 rounded-xl font-bold shadow hover:from-cyan-500/40 hover:to-emerald-500/40 transition-all"
            >
              🌿 Manage Ingredients
            </button>
            <button
              onClick={() => setShowBottleEditor(true)}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-100 rounded-xl font-bold shadow hover:from-cyan-500/40 hover:to-emerald-500/40 transition-all"
            >
              🍾 Edit Bottles
            </button>
            {/* Machine selector: switching machines reloads bottle slots */}
            {machines.length > 0 && (
              <select
                value={selectedMachine || ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setSelectedMachine(val);
                  // fetch bottles for selected machine
                  (async () => {
                    if (!val) return;
                    try {
                      const resp = await fetch(`${API_BASE}/bottles/?machine=${encodeURIComponent(val)}`);
                      const data = await resp.json();
                      setBottles(data || []);
                    } catch (err) {
                      console.error('Failed to load bottles for machine', err);
                      showToast('Failed to load bottles for selected machine', 'error');
                    }
                  })();
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 text-cyan-100 rounded-xl border border-cyan-400/20 shadow"
              >
                {machines.map((m) => (
                  <option key={m.machine_id} value={m.machine_id}>{m.label || m.machine_id}</option>
                ))}
              </select>
            )}
            <div className="text-xs text-cyan-100/60">
              <IdleTimer
                onTimeout={() => {
                  logout({ navigate: (p) => router.push(p), destination: "/owner-login" });
                }}
                timeoutSeconds={15}
              />
            </div>
            <button
              onClick={() => {
                logout({ navigate: (p) => router.push(p), destination: "/owner-login" });
              }}
              className="px-4 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-200 rounded-xl text-sm font-bold shadow hover:scale-105 transition-transform"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Recipes */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-cyan-200 mb-2 drop-shadow">Recipes</h2>
              <p className="text-cyan-100/80 text-lg">Manage your drink recipes and ingredients</p>
            </div>

            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 rounded-xl p-6 animate-pulse shadow-lg">
                    <div className="w-28 h-20 bg-cyan-500/10 rounded mb-3" />
                    <div className="h-4 bg-cyan-500/10 rounded mb-2 w-2/3" />
                    <div className="h-3 bg-cyan-500/10 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {!loading && recipes.length === 0 && (
              <div className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 rounded-xl p-12 text-center shadow-lg">
                <p className="text-cyan-100/80 text-lg">No recipes yet. Create one to get started!</p>
              </div>
            )}

            {!loading && recipes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recipes.map((r) => (
                  <div
                    key={r.recipe_name}
                    className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 hover:from-cyan-500/20 hover:to-emerald-500/20 rounded-xl p-6 border border-cyan-400/10 hover:border-cyan-400/30 transition-all group shadow-lg animate-in fade-in"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-24 h-18 bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 rounded-xl overflow-hidden flex-shrink-0 shadow">
                        {r.video_url ? (
                          <video src={r.video_url} className="w-full h-full object-cover" muted loop />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-cyan-100/30 text-3xl">🎬</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-cyan-200 text-xl drop-shadow">{r.recipe_name}</h3>
                        <p className="text-emerald-300 text-lg font-bold">₹{r.price}</p>
                        <p className="text-xs text-cyan-100/80 mt-2">
                          {((r as any).ingredients || (r as any).recipe_ingredients || [])
                            .map((it: any) => (it.ingredient ? `${it.ingredient.name}: ${it.amount_ml}ml` : `${it.amount_ml}ml`))
                            .filter(Boolean)
                            .slice(0, 3)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(r)}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-yellow-500/20 to-yellow-500/40 text-yellow-300 rounded-xl text-sm font-bold shadow hover:scale-105 transition-transform"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ name: r.recipe_name })}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 rounded-xl text-sm font-bold shadow hover:scale-105 transition-transform"
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
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-cyan-200 mb-2 drop-shadow">Today’s Summary</h2>
              <p className="text-cyan-100/80 text-lg">Real-time sales metrics</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl p-6 border border-emerald-400/30 shadow-lg">
                <p className="text-emerald-300 text-lg font-bold">Sales Count</p>
                <p className="text-4xl font-extrabold text-cyan-200 mt-2 drop-shadow">{dailyCounts.length}</p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-xl p-6 border border-cyan-400/30 shadow-lg">
                <p className="text-cyan-300 text-lg font-bold">Total Revenue</p>
                <p className="text-4xl font-extrabold text-emerald-300 mt-2 drop-shadow">₹{totalRevenue}</p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 rounded-xl p-6 border border-cyan-400/10 max-h-64 overflow-auto shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-cyan-200 font-bold text-lg">Recent Transactions</p>
                  <button
                    onClick={() => router.push('/owner/sales-details')}
                    className="text-xs px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-xl text-cyan-100 font-bold shadow hover:from-cyan-500/40 hover:to-emerald-500/40 transition-all"
                  >
                    View Sales Details
                  </button>
                </div>
                {dailyCounts.length === 0 ? (
                  <p className="text-cyan-100/80 text-xs">No sales yet</p>
                ) : (
                  <div className="space-y-2">
                    {dailyCounts.slice(0, 8).map((d, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-cyan-100 pb-2 border-b border-cyan-400/10">
                        <span className="font-mono">{new Date(d.timestamp).toLocaleTimeString()}</span>
                        <span className="text-emerald-300 font-bold">+₹{d.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-lg p-6 w-96 animate-in fade-in scale-in">
            <h3 className="text-xl font-bold text-white mb-2">Delete Recipe?</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? You can undo this action for 5 seconds.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteRecipeOptimistic(deleteConfirm?.name)}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Details Modal */}
      {showSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg w-[min(800px,95%)] max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Sales Details</h3>
                <button onClick={() => setShowSalesModal(false)} className="text-sm text-gray-300">Close</button>
              </div>

              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                  <select
                    value={salesFilterRecipe ?? ""}
                    onChange={(e) => setSalesFilterRecipe(e.target.value || null)}
                    className="px-3 py-2 bg-white/5 rounded border border-white/10 text-white"
                  >
                    <option value="">-- Filter by recipe --</option>
                    {recipes.map((r) => (
                      <option key={r.recipe_name} value={r.recipe_name}>{r.recipe_name}</option>
                    ))}
                  </select>

                  <select
                    value={salesFilterMachine ?? ""}
                    onChange={(e) => setSalesFilterMachine(e.target.value || null)}
                    className="px-3 py-2 bg-white/5 rounded border border-white/10 text-white"
                  >
                    <option value="">-- Filter by machine --</option>
                    {machines.map((m) => (
                      <option key={m.machine_id} value={m.machine_id}>{m.label || m.machine_id}</option>
                    ))}
                  </select>

                  <input
                    placeholder="Customer name contains..."
                    value={salesFilterCustomer ?? ""}
                    onChange={(e) => setSalesFilterCustomer(e.target.value || null)}
                    className="px-3 py-2 bg-white/5 rounded border border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  {dailyCounts
                    .filter((d: any) => {
                      if (salesFilterRecipe && d.recipe !== salesFilterRecipe) return false;
                      if (salesFilterMachine) {
                        // machine field may be null, string, or object; handle string PK
                        const mval = d.machine && typeof d.machine === 'string' ? d.machine : (d.machine && d.machine.machine_id ? d.machine.machine_id : d.machine);
                        if (mval !== salesFilterMachine) return false;
                      }
                      if (salesFilterCustomer) {
                        const cname = d.customer ? String(d.customer) : "";
                        if (!cname.toLowerCase().includes(salesFilterCustomer.toLowerCase())) return false;
                      }
                      return true;
                    })
                    .map((d: any, idx) => (
                      <div key={d.id ?? idx} className="p-3 bg-white/5 rounded border border-white/6 flex justify-between items-center">
                        <div>
                          <div className="text-sm text-gray-300">{new Date(d.timestamp).toLocaleString()}</div>
                          <div className="text-sm text-gray-200">{d.recipe ? `Recipe: ${d.recipe}` : "Recipe: -"} {d.customer ? ` • Customer: ${d.customer}` : ''}</div>
                          {d.machine && <div className="text-xs text-gray-400">Machine: {typeof d.machine === 'string' ? d.machine : (d.machine && d.machine.machine_id ? d.machine.machine_id : d.machine)}</div>}
                        </div>
                        <div className="text-emerald-300 font-semibold">+₹{d.amount}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Recipe Modal */}
      {showRecipeModal && (
        <RecipeModal recipe={editingRecipe} ingredientsList={ingredientsList} onClose={() => setShowRecipeModal(false)} onSave={saveRecipe} />
      )}

      {/* Bottle Editor Modal */}
      {showBottleEditor && (
        <BottleEditor bottles={bottles} ingredientsList={ingredientsList} onClose={() => setShowBottleEditor(false)} onSave={saveBottles} />
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-right">
          <div
            className={`rounded-lg px-4 py-3 flex items-center gap-3 backdrop-blur-md border ${
              toast?.type === "success"
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                : toast?.type === "error"
                ? "bg-red-500/20 border-red-500/30 text-red-300"
                : "bg-blue-500/20 border-blue-500/30 text-blue-300"
            }`}
          >
            <span>
              {toast?.type === "success" ? "✓" : toast?.type === "error" ? "✕" : "ℹ"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{toast?.message}</span>
              {toast?.action && (
                <button
                  onClick={() => {
                    if (toast?.action) {
                      toast.action();
                    }
                    setToast(null);
                  }}
                  className="text-xs font-semibold underline ml-2 hover:opacity-80"
                >
                  Undo
                </button>
              )}
            </div>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
              ✕
            </button>
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

type RecipeModalProps = {
  recipe: Recipe | null;
  onClose: () => void;
  ingredientsList: { id: number; name: string; is_cold?: boolean }[];
  onSave: (payload: RecipeForm & { recipe_ingredients?: any[] }, isNew: boolean) => Promise<void>;
};
function RecipeModal({ recipe, ingredientsList, onClose, onSave }: RecipeModalProps) {
  const isNew = !recipe;
  const [name, setName] = useState<string>(recipe ? recipe.recipe_name : "");
  const [price, setPrice] = useState<number>(recipe ? Number((recipe as any).price) || 10 : 10);
  const [videoUrl, setVideoUrl] = useState<string>(recipe ? (recipe as any).video_url || "" : "");
  const [rows, setRows] = useState<{ id?: number; ingredientId?: number; name?: string; amount_ml: number }[]>(() => {
    if (recipe && (recipe as any).ingredients) {
      return (recipe as any).ingredients.map((it: any) => ({
        ingredientId: it.ingredient?.id ?? undefined,
        name: it.ingredient?.name ?? "",
        amount_ml: Number(it.amount_ml) || 0,
      }));
    }
    return [{ ingredientId: undefined, name: "", amount_ml: 0 }];
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (recipe) {
      setName(recipe.recipe_name);
      setPrice(Number((recipe as any).price) || 10);
      setVideoUrl((recipe as any).video_url || "");
      setRows((recipe as any).ingredients?.map((it: any) => ({ ingredientId: it.ingredient?.id ?? undefined, name: it.ingredient?.name ?? "", amount_ml: Number(it.amount_ml) || 0 })) || [{ ingredientId: undefined, name: "", amount_ml: 0 }]);
    } else {
      setName("");
      setPrice(10);
      setVideoUrl("");
      setRows([{ ingredientId: undefined, name: "", amount_ml: 0 }]);
    }
  }, [recipe]);

  function setRow(idx: number, patch: Partial<{ ingredientId?: number; name?: string; amount_ml: number }>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((r) => [...r, { ingredientId: undefined, name: "", amount_ml: 0 }]);
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }

  async function submit() {
    const newErrors: string[] = [];
    if (!name.trim()) newErrors.push("Recipe name is required");
    if (Number(price) < 0) newErrors.push("Price must be >= 0");
    const used = rows.filter((rr) => Number(rr.amount_ml) > 0 && (rr.ingredientId || rr.name));
    if (used.length === 0) newErrors.push("Add at least one ingredient with ml > 0");
    if (newErrors.length) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    const payload: any = {
      recipe_name: name,
      price: Number(price),
      video_url: videoUrl,
      recipe_ingredients: rows.map((rr) => ({ ingredient: rr.ingredientId ?? rr.name, amount_ml: Number(rr.amount_ml) })),
    };

    await onSave(payload, isNew);
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
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors([]); }}
                className="mt-2 w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="e.g., Mojito"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 font-medium">Price (₹) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => { setPrice(Number(e.target.value)); setErrors([]); }}
                className="mt-2 w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-300 font-medium">Video URL</label>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="mt-2 w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="https://example.com/video.mp4"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-gray-300 font-medium mb-3 block">Recipe Ingredients</label>
              <div className="space-y-3 bg-white/5 p-3 rounded">
                {rows.map((rrow, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <label className="text-xs text-gray-400">Ingredient</label>
                      <select
                        className="mt-1 w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                        value={rrow.ingredientId ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          const id = v ? Number(v) : undefined;
                          const chosen = ingredientsList.find((x) => x.id === id);
                          setRow(idx, { ingredientId: id, name: chosen ? chosen.name : "" });
                        }}
                      >
                        <option value="">-- select ingredient --</option>
                        {ingredientsList.map((ing) => (
                          <option key={ing.id} value={ing.id}>{ing.name} {ing.is_cold ? "(Cold)" : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs text-gray-400">Amount (ml)</label>
                      <input type="number" className="mt-1 w-full p-2 bg-white/10 border border-white/20 rounded text-white" value={rrow.amount_ml}
                        onChange={(e) => setRow(idx, { amount_ml: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-3 flex items-end gap-2 justify-end">
                      <button type="button" className="px-3 py-1 bg-green-500/20 rounded" onClick={() => setRow(idx, { ingredientId: undefined, name: "" })}>Clear</button>
                      <button type="button" className="px-3 py-1 bg-red-500/20 rounded text-red-300" onClick={() => removeRow(idx)}>Remove</button>
                    </div>
                  </div>
                ))}

                <div className="pt-2">
                  <button type="button" className="px-4 py-2 bg-indigo-500 rounded" onClick={addRow}>+ Add Ingredient</button>
                </div>
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

type BottleEditorProps = {
  bottles: Bottle[];
  ingredientsList: { id: number; name: string; is_cold: boolean }[];
  onClose: () => void;
  onSave: (updated: Bottle[]) => Promise<void>;
};

function BottleEditor({ bottles, ingredientsList, onClose, onSave }: BottleEditorProps) {
  function makeSlots(src: Bottle[]) {
    const slots: Bottle[] = [];
    for (let i = 1; i <= 12; i++) {
      const found = src.find((s) => s.bottle_number === i);
      slots.push(found ? { ...found } : { bottle_number: i, liquid_name: "" });
    }
    return slots;
  }

  const [local, setLocal] = useState<Bottle[]>(() => makeSlots(bottles));

  useEffect(() => {
    startTransition(() => {
      setLocal(makeSlots(bottles));
    });
  }, [bottles]);

  function setNameByIndex(idx: number, name: string) {
    setLocal((l) => l.map((it, i) => (i === idx ? { ...it, liquid_name: name } : it)));
  }

  async function handleSave() {
    await onSave(local);
  }

  function BottleSuggest({
    value,
    onChange,
    suggestions,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    suggestions: { id: number; name: string }[];
    placeholder?: string;
  }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value || "");
    const [highlight, setHighlight] = useState(0);

    useEffect(() => setQuery(value || ""), [value]);

    const filtered = suggestions.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));

    function select(v: string) {
      onChange(v);
      setQuery(v);
      setOpen(false);
    }

    return (
      <div className="relative">
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
            else if (e.key === "ArrowUp") { setHighlight((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter") { if (filtered[highlight]) select(filtered[highlight].name); }
          }}
          placeholder={placeholder}
          className="mt-1 w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
        />

        {open && filtered.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-40 w-full overflow-auto bg-white/5 border border-white/10 rounded shadow-lg">
            {filtered.map((s, i) => (
              <li
                key={s.id}
                onMouseDown={(ev) => { ev.preventDefault(); select(s.name); }}
                onMouseEnter={() => setHighlight(i)}
                className={`px-3 py-2 cursor-pointer ${i === highlight ? "bg-white/10" : ""}`}
              >
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-lg w-[min(900px,95%)] max-h-[90vh] overflow-auto">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-1">Edit Bottle Slots</h3>
          <p className="text-gray-400 text-sm mb-6">Assign liquids to each bottle position</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Cold slots (B1-B6) */}
            <div>
              <h4 className="text-sm text-gray-300 font-semibold mb-3">Cold Slots (B1 - B6)</h4>
              <div className="grid grid-cols-2 gap-3">
                {local.slice(0, 6).map((b, idx) => (
                  <div key={b.bottle_number} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-400 font-medium">B{b.bottle_number}</label>
                      <span className="text-xs text-indigo-300">Cold</span>
                    </div>
                    <BottleSuggest
                      value={b.liquid_name}
                      onChange={(v) => setNameByIndex(idx, v)}
                      suggestions={ingredientsList.filter((ing) => ing.is_cold)}
                      placeholder="Select or type ingredient"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Normal slots (B7-B12) */}
            <div>
              <h4 className="text-sm text-gray-300 font-semibold mb-3">Normal Slots (B7 - B12)</h4>
              <div className="grid grid-cols-2 gap-3">
                {local.slice(6, 12).map((b, idx) => (
                  <div key={b.bottle_number} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-400 font-medium">B{b.bottle_number}</label>
                      <span className="text-xs text-amber-300">Normal</span>
                    </div>
                    <BottleSuggest
                      value={b.liquid_name}
                      onChange={(v) => setNameByIndex(6 + idx, v)}
                      suggestions={ingredientsList.filter((ing) => !ing.is_cold)}
                      placeholder="Select or type ingredient"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* suggestions are shown via the inline autosuggest component */}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
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
