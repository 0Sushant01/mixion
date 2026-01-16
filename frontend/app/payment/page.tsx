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

    // Record sale to backend (best-effort).
    (async () => {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_BASE as string) || "http://localhost:8000/api";
        const payload: any = { recipe_name: recipe?.recipe_name, amount: recipe?.price };
        try {
          const machineId = (process.env.NEXT_PUBLIC_MACHINE_ID as string) || null;
          if (machineId) payload.machine_id = machineId;
        } catch { }
        try {
          const cur = JSON.parse(localStorage.getItem("current_customer") || "null");
          if (cur && cur.id) payload.customer_id = cur.id;
        } catch { }

        await fetch(`${apiBase}/record_sale/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        // Ignore failures
      }
    })();

    await new Promise((res) => setTimeout(res, 2000));
    router.push("/ask");
  }

  if (!recipe) return null;

  const paymentMethods = [
    { id: "card", label: "Card", icon: "💳" },
    { id: "cash", label: "Cash", icon: "💵" },
    { id: "mobile", label: "Mobile Pay", icon: "📱" },
    { id: "wallet", label: "Wallet", icon: "👛" },
  ];

  return (
    <div className="full-page-overlay fixed inset-0 z-[9999] h-screen w-screen bg-[#0F172A] text-[#F8FAFC] overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#1E293B]/95 backdrop-blur-md border-b border-[#7C3AED]/20 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC]">Payment</h1>
            <p className="text-[#94A3B8] text-xs">Choose your payment method</p>
          </div>
          <div className="text-xs text-[#94A3B8]">
            <IdleTimer onTimeout={() => logout((p) => router.push(p))} timeoutSeconds={15} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 py-6">
        <div className="w-full max-w-lg mx-auto bg-[#1E293B] rounded-2xl border border-[#7C3AED]/20 p-6 shadow-lg animate-fadeIn">
          {status === "idle" && (
            <div>
              {/* Order Summary */}
              <div className="mb-6 p-4 bg-[#0F172A] rounded-xl border border-[#7C3AED]/10">
                <p className="text-[#94A3B8] text-xs uppercase tracking-wide mb-1">Order Summary</p>
                <h2 className="text-xl font-bold text-[#F8FAFC] mb-1">{recipe.recipe_name}</h2>
                <p className="text-3xl font-bold text-[#FACC15]">₹{recipe.price}</p>
              </div>

              {/* Payment Methods */}
              <p className="text-[#94A3B8] text-xs uppercase tracking-wide mb-3">Select Payment Method</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => doPayment(method.id)}
                    className={`group relative p-4 rounded-xl border transition-all transform hover:scale-105 ${selectedMethod === method.id
                      ? "bg-[#7C3AED] border-[#7C3AED] shadow-lg text-white"
                      : "bg-[#0F172A] border-[#7C3AED]/20 hover:border-[#7C3AED]/50 text-[#F8FAFC] hover:bg-[#7C3AED]/10"
                      }`}
                  >
                    <div className="text-3xl mb-2">{method.icon}</div>
                    <p className={`font-semibold text-sm`}>{method.label}</p>
                  </button>
                ))}
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => router.push("/products")}
                className="w-full px-6 py-3 bg-[#1E293B] text-[#F8FAFC] font-semibold rounded-xl border border-[#7C3AED]/30 transition-all hover:bg-[#7C3AED]/10"
              >
                Cancel
              </button>
            </div>
          )}

          {status === "processing" && (
            <div className="text-center py-12">
              <div className="inline-block mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-[#7C3AED]/30 border-t-[#7C3AED] animate-spin" />
              </div>
              <p className="text-xl font-bold text-[#F8FAFC] mb-2">Processing Payment</p>
              <p className="text-[#94A3B8]">Please wait...</p>
            </div>
          )}

          {status === "dispensing" && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">✨</div>
              <p className="text-xl font-bold text-[#F8FAFC] mb-2">Payment Successful!</p>
              <p className="text-[#22C55E] mb-6">Your drink is being prepared...</p>
              <div className="w-full h-2 bg-[#0F172A] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#22C55E] to-[#14B8A6] animate-pulse" />
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
