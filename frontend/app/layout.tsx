import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MIXION Kiosk",
  description: "MIXION frontend demo - kiosk UI for testing Tailwind + Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
        {/* Main app container */}
        <div className="min-h-screen flex flex-col">
          {/* Top header */}
          <header className="bg-white shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                  M
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">MIXION</h1>
                  <p className="text-xs text-gray-500">Kiosk demo</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Device: demo</span>
                <span className="text-sm text-green-600">● online</span>
              </div>
            </div>
          </header>

          {/* Kiosk area */}
          <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
            {/* Kiosk wrapper with 3 main views: idle / buy / owner */}
            <div id="kiosk" className="bg-white rounded-lg shadow p-6">
              {/* Idle Screen */}
              <section id="view-idle" className="kiosk-view">
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome</h2>
                    <p className="text-gray-600 mb-6">Select an option to begin</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                    <button
                      className="p-6 rounded-lg bg-indigo-600 text-white text-xl font-semibold shadow hover:bg-indigo-700"
                      data-nav="buy"
                    >
                      Buy Drink
                    </button>
                    <button
                      className="p-6 rounded-lg bg-emerald-600 text-white text-xl font-semibold shadow hover:bg-emerald-700"
                      data-nav="owner"
                    >
                      Owner Login
                    </button>
                    <button
                      className="p-6 rounded-lg bg-gray-100 text-gray-800 text-xl font-medium border hover:bg-gray-200"
                      data-nav="help"
                    >
                      Help / Info
                    </button>
                  </div>
                </div>
              </section>

              {/* Buy Screen */}
              <section id="view-buy" className="kiosk-view hidden">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-semibold text-gray-900">Products</h3>
                  <div>
                    <button className="px-3 py-2 rounded bg-gray-100 mr-2" data-nav="idle">
                      Back
                    </button>
                    <button className="px-3 py-2 rounded bg-indigo-600 text-white" data-nav="checkout">
                      Checkout
                    </button>
                  </div>
                </div>

                {/* Simple product grid for quick visual test */}
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
                      <button className="px-3 py-2 bg-indigo-600 text-white rounded" data-action="buy-now">
                        Buy
                      </button>
                    </div>
                  </article>

                  {/* Placeholder product - repeatable */}
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
                      <button className="px-3 py-2 bg-indigo-600 text-white rounded" data-action="buy-now">
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
                      <button className="px-3 py-2 bg-indigo-600 text-white rounded" data-action="buy-now">
                        Buy
                      </button>
                    </div>
                  </article>
                </div>
              </section>

              {/* Owner Login Screen (simple) */}
              <section id="view-owner" className="kiosk-view hidden">
                <div className="max-w-md">
                  <h3 className="text-2xl font-semibold mb-4">Owner Login</h3>
                  <p className="text-sm text-gray-500 mb-4">Use owner credentials to access the management dashboard.</p>
                  <form id="owner-form" className="space-y-3">
                    <input type="text" name="username" placeholder="username" className="w-full p-3 border rounded" />
                    <input type="password" name="password" placeholder="password" className="w-full p-3 border rounded" />
                    <div className="flex items-center justify-between">
                      <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Login</button>
                      <button type="button" className="px-3 py-2 bg-gray-100 rounded" data-nav="idle">Cancel</button>
                    </div>
                    <p className="text-xs text-gray-400">Note: this is a demo login. Integrate with your Django API for production auth.</p>
                  </form>
                </div>
              </section>

              {/* Checkout / Thank you placeholder */}
              <section id="view-checkout" className="kiosk-view hidden">
                <div className="text-center py-12">
                  <h3 className="text-2xl font-semibold">Processing Payment</h3>
                  <p className="text-gray-500 mt-4">Simulating payment and dispense for testing. This is a UI-only test.</p>
                  <div className="mt-8">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded" data-nav="idle">Finish (Return to Idle)</button>
                  </div>
                </div>
              </section>

              {/* Help view */}
              <section id="view-help" className="kiosk-view hidden">
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Help & Info</h3>
                  <p className="text-sm text-gray-600 mb-4">Instructions and contact details go here.</p>
                  <button className="px-3 py-2 bg-gray-100 rounded" data-nav="idle">Back</button>
                </div>
              </section>
            </div>

            {/* Render actual app children (server-rendered pages) below kiosk UI */}
            <div className="mt-6">{children}</div>
          </main>

          <footer className="bg-white border-t py-3">
            <div className="max-w-6xl mx-auto px-4 text-sm text-gray-500">© MIXION demo</div>
          </footer>
        </div>

        {/* Minimal inline script to enable hash/navigation and simple click handlers for demo checks.
            Replace with React client components and proper routing later. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  function showView(id) {
    document.querySelectorAll('.kiosk-view').forEach(function (el) {
      el.classList.add('hidden');
    });
    var v = document.getElementById('view-' + id);
    if (v) v.classList.remove('hidden');
    else document.getElementById('view-idle').classList.remove('hidden');
    location.hash = id;
  }
  // wire CTA buttons
  document.querySelectorAll('[data-nav]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var nav = btn.getAttribute('data-nav');
      if (nav === 'checkout') {
        showView('checkout');
      } else if (nav) {
        showView(nav);
      }
    });
  });
  // wire buy buttons to go to checkout
  document.querySelectorAll('[data-action="buy-now"]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      showView('checkout');
    });
  });
  // owner form demo: prevent submission and show owner dashboard placeholder
  var ownerForm = document.getElementById('owner-form');
  if (ownerForm) {
    ownerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Demo owner login: replace with real authentication.');
      showView('idle');
    });
  }
  // on load, honor location.hash
  var h = location.hash.replace('#','');
  if (h) showView(h); else showView('idle');
})();
`,
          }}
        />
      </body>
    </html>
  );
}
