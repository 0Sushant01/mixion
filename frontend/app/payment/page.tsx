"use client";

import React from "react";
import { useRouter } from "next/navigation";
import IdleTimer from "../components/IdleTimer";
import { getSelectedRecipe, logout, SessionRecipe } from "../components/session";

type PaymentStatus = "idle" | "processing" | "dispensing";

export default function PaymentPage() {
  const router = useRouter();
  const [recipe, setRecipe] = React.useState<SessionRecipe | null>(null);
  const [status, setStatus] = React.useState<PaymentStatus>("idle");
  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(null);

  React.useEffect(() => {
    const r = getSelectedRecipe();
    if (!r) return router.push("/products");
    setRecipe(r);
  }, [router]);

  async function doPayment(method: string) {
    setSelectedMethod(method);
    setStatus("processing");
    await new Promise((res) => setTimeout(res, 1200));
    setStatus("dispensing");

    // Record sale to backend (best-effort). Use NEXT_PUBLIC_API_BASE or default.
    (async () => {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_BASE as string) || "http://localhost:8000/api";
        const payload: any = { recipe_name: recipe?.recipe_name, amount: recipe?.price };
        // include machine id if configured via env var
        try {
          const machineId = (process.env.NEXT_PUBLIC_MACHINE_ID as string) || null;
          if (machineId) payload.machine_id = machineId;
        } catch {}
        try {
          const cur = JSON.parse(localStorage.getItem("current_customer") || "null");
          if (cur && cur.id) payload.customer_id = cur.id;
        } catch {}

        await fetch(`${apiBase}/record_sale/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        // Ignore failures; this is a demo-friendly best-effort call.
        // Optionally log to analytics in production.
      }
    })();

    await new Promise((res) => setTimeout(res, 2000));
    router.push("/ask");
  }

  if (!recipe) return null;

  const paymentMethods = [
    { id: "card", label: "Card", icon: "💳", gradient: "from-indigo-500 to-indigo-600" },
    { id: "cash", label: "Cash", icon: "💵", gradient: "from-green-500 to-green-600" },
    { id: "mobile", label: "Mobile Pay", icon: "📱", gradient: "from-blue-500 to-blue-600" },
    { id: "wallet", label: "Wallet", icon: "👛", gradient: "from-yellow-500 to-yellow-600" },
  ];

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/60 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Payment</h1>
            <p className="text-slate-600 text-sm mt-1">Choose your payment method</p>
          </div>
          <div className="text-xs text-slate-500">
            <IdleTimer onTimeout={() => logout((p) => router.push(p))} timeoutSeconds={15} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl bg-white/60 backdrop-blur-lg rounded-3xl border border-gray-200 p-8 shadow-sm">
          {status === "idle" && (
            <div className="animate-fadeIn">
              {/* Order Summary */}
              <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-gray-100">
                <p className="text-slate-500 text-sm uppercase tracking-wide mb-2">Order Summary</p>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">{recipe.recipe_name}</h2>
                <p className="text-4xl font-bold text-indigo-600">₹{recipe.price}</p>
              </div>

              {/* Payment Methods */}
              <p className="text-slate-600 text-sm uppercase tracking-wide mb-4">Select Payment Method</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => doPayment(method.id)}
                    className={`group relative p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${
                      selectedMethod === method.id
                        ? `bg-gradient-to-r ${method.gradient} border-white/30 shadow-lg text-white`
                        : "bg-white border-gray-100 hover:border-gray-200 text-slate-800"
                    }`}
                  >
                    <div className="text-3xl mb-2">{method.icon}</div>
                    <p className={`${selectedMethod === method.id ? 'text-white font-semibold' : 'font-semibold'}`}>{method.label}</p>
                  </button>
                ))}
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => router.push("/products")}
                className="w-full px-6 py-3 bg-white text-slate-800 font-semibold rounded-xl border border-gray-200 transition-all hover:shadow-sm"
              >
                Cancel
              </button>
            </div>
          )}

          {status === "processing" && (
            <div className="animate-fadeIn text-center py-12">
              <div className="inline-block mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-2">Processing Payment</p>
              <p className="text-slate-600">Please wait...</p>
            </div>
          )}

          {status === "dispensing" && (
            <div className="animate-fadeIn text-center py-12">
              <div className="text-5xl mb-4">✨</div>
              <p className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</p>
              <p className="text-green-600 mb-6">Your drink is being prepared...</p>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
