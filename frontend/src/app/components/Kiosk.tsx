"use client";

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function Kiosk() {
  const location = useLocation();
  // Prefer the real window.pathname when available to avoid an initial mismatch
  // between server and client or between hook timing and initial render.
  let pathname = "";
  if (typeof window !== "undefined") {
    pathname = window.location.pathname || "";
  } else {
    pathname = location.pathname || "";
  }

  // Hide kiosk on pages where an account flow or login is happening
  if (pathname.includes("/signup") || pathname.includes("/login") || pathname.includes("/owner-login")) {
    return null;
  }

  const [view, setView] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const h = location.hash.replace('#', '');
      return h || 'buy';
    }
    return 'buy';
  });

  useEffect(() => {
    function onHash() {
      const h = location.hash.replace('#', '');
      if (h) setView(h);
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div id="kiosk" className="bg-white rounded-lg shadow p-6">
      {/* Buy Screen */}
      <section id="view-buy" className={`kiosk-view ${view !== 'buy' ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-semibold text-gray-900">Products</h3>
          <div>
            <button className="px-3 py-2 rounded bg-gray-100 mr-2" onClick={() => setView('buy')}>
              Back
            </button>
            <button className="px-3 py-2 rounded bg-indigo-600 text-white" onClick={() => setView('checkout')}>
              Checkout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <article className="border rounded-lg p-4 flex flex-col">
            <div className="h-40 bg-gradient-to-br from-pink-100 to-indigo-100 rounded-md mb-4 flex items-center justify-center text-2xl font-bold text-gray-700">
              Cola Mix
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-medium">Cola Mix 250ml</h4>
              <p className="text-sm text-gray-500 mt-1">A refreshing cola blend</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xl font-semibold">₹40</div>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={() => setView('checkout')}>
                Buy
              </button>
            </div>
          </article>

          <article className="border rounded-lg p-4 flex flex-col">
            <div className="h-40 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-md mb-4 flex items-center justify-center text-2xl font-bold text-gray-700">
              Citrus
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-medium">Citrus Spark 200ml</h4>
              <p className="text-sm text-gray-500 mt-1">Zesty and bright</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xl font-semibold">₹45</div>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={() => setView('checkout')}>
                Buy
              </button>
            </div>
          </article>

          <article className="border rounded-lg p-4 flex flex-col">
            <div className="h-40 bg-gradient-to-br from-teal-100 to-green-100 rounded-md mb-4 flex items-center justify-center text-2xl font-bold text-gray-700">
              Cola Lite
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-medium">Cola Lite 180ml</h4>
              <p className="text-sm text-gray-500 mt-1">Lower sugar option</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xl font-semibold">₹35</div>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={() => setView('checkout')}>
                Buy
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* Owner Login Screen (simple) */}
      <section id="view-owner" className={`kiosk-view ${view !== 'owner' ? 'hidden' : ''}`}>
        <div className="max-w-md">
          <h3 className="text-2xl font-semibold mb-4">Owner Login</h3>
          <p className="text-sm text-gray-500 mb-4">Use owner credentials to access the management dashboard.</p>
          <form
            id="owner-form"
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              alert('Demo owner login: replace with real authentication.');
              setView('buy');
            }}
          >
            <input type="text" name="username" placeholder="username" className="w-full p-3 border rounded" />
            <input type="password" name="password" placeholder="password" className="w-full p-3 border rounded" />
            <div className="flex items-center justify-between">
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Login</button>
              <button type="button" className="px-3 py-2 bg-gray-100 rounded" onClick={() => setView('buy')}>Cancel</button>
            </div>
            <p className="text-xs text-gray-400">Note: this is a demo login. Integrate with your Django API for production auth.</p>
          </form>
        </div>
      </section>

      {/* Checkout / Thank you placeholder */}
      <section id="view-checkout" className={`kiosk-view ${view !== 'checkout' ? 'hidden' : ''}`}>
        <div className="text-center py-12">
          <h3 className="text-2xl font-semibold">Processing Payment</h3>
          <p className="text-gray-500 mt-4">Simulating payment and dispense for testing. This is a UI-only test.</p>
          <div className="mt-8">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => setView('buy')}>Finish (Return to Buy)</button>
          </div>
        </div>
      </section>

      {/* Help view */}
      <section id="view-help" className={`kiosk-view ${view !== 'help' ? 'hidden' : ''}`}>
        <div>
          <h3 className="text-2xl font-semibold mb-2">Help & Info</h3>
          <p className="text-sm text-gray-600 mb-4">Instructions and contact details go here.</p>
          <button className="px-3 py-2 bg-gray-100 rounded" onClick={() => setView('buy')}>Back</button>
        </div>
      </section>
    </div>
  );
}
