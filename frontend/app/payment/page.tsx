"use client";

import React from "react";
import { useRouter } from "next/navigation";
import IdleTimer from "../components/IdleTimer";
import { getSelectedRecipe, getCurrentCustomer, logout } from "../components/session";

type PaymentStatus = "idle" | "processing" | "dispensing";

export default function PaymentPage() {
  const router = useRouter();
  const [recipe, setRecipe] = React.useState<any>(null);
  const [status, setStatus] = React.useState<PaymentStatus>("idle");
  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(null);

  React.useEffect(() => {
    const c = getCurrentCustomer();
    if (!c) return router.push("/login");
    const r = getSelectedRecipe();
    if (!r) return router.push("/products");
    setRecipe(r);
  }, [router]);

  async function doPayment(method: string) {
    setSelectedMethod(method);
    setStatus("processing");
    await new Promise((res) => setTimeout(res, 1200));
    setStatus("dispensing");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/10 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Payment</h1>
            <p className="text-gray-300 text-sm mt-1">Choose your payment method</p>
          </div>
          <div className="text-xs text-gray-400">
            <IdleTimer onTimeout={() => logout((p) => router.push(p))} timeoutSeconds={15} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
          {status === "idle" && (
            <div className="animate-fadeIn">
              {/* Order Summary */}
              <div className="mb-8 p-6 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                <p className="text-gray-300 text-sm uppercase tracking-wide mb-2">Order Summary</p>
                <h2 className="text-3xl font-bold text-white mb-2">{recipe.recipe_name}</h2>
                <p className="text-4xl font-bold text-indigo-300">₹{recipe.price}</p>
              </div>

              {/* Payment Methods */}
              <p className="text-gray-300 text-sm uppercase tracking-wide mb-4">Select Payment Method</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => doPayment(method.id)}
                    className={`group relative p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${
                      selectedMethod === method.id
                        ? `bg-gradient-to-r ${method.gradient} border-white/30 shadow-lg`
                        : "bg-white/5 border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="text-3xl mb-2">{method.icon}</div>
                    <p className="text-white font-semibold">{method.label}</p>
                  </button>
                ))}
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => router.push("/products")}
                className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {status === "processing" && (
            <div className="animate-fadeIn text-center py-12">
              <div className="inline-block mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
              </div>
              <p className="text-2xl font-bold text-white mb-2">Processing Payment</p>
              <p className="text-gray-400">Please wait...</p>
            </div>
          )}

          {status === "dispensing" && (
            <div className="animate-fadeIn text-center py-12">
              <div className="text-5xl mb-4">✨</div>
              <p className="text-2xl font-bold text-white mb-2">Payment Successful!</p>
              <p className="text-green-300 mb-6">Your drink is being prepared...</p>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
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
