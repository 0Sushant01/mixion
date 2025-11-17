"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  function handleAnyClick() {
    // On first user interaction: unmute the video so voice/audio in the video can play,
    // then show the login options overlay. We don't immediately navigate so audio can play.
    const vid = document.getElementById("idle-video") as HTMLVideoElement | null;
    if (vid) {
      try {
        vid.muted = false;
        // ensure play() is called as a result of user gesture
        vid.play().catch(() => {
          /* ignore play errors */
        });
      } catch (e) {
        // ignore
      }
    }
    setShowModal(true);
  }

  return (
    <div
      onClick={handleAnyClick}
      className="min-h-screen flex items-center justify-center bg-zinc-900 text-white select-none"
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-gradient absolute inset-0 bg-gradient-to-tr from-[#ff7a7a] via-[#ffd47a] to-[#7afcff] opacity-60" />
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="g" x1="0" x2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <rect width="800" height="600" fill="url(#g)" />
        </svg>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <video
          id="idle-video"
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={process.env.NEXT_PUBLIC_IDLE_VIDEO || '/idle.mp4'} type="video/mp4" />
          {/* fallback message */}
          Your browser does not support HTML5 video.
        </video>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <h1 className="text-5xl font-extrabold tracking-tight text-white drop-shadow-lg">Mixion</h1>
          <p className="mt-3 text-white/80">Touch anywhere to begin</p>
        </div>
      </div>

      {/* When showModal is true we display the login overlay (Customer / Owner) on top of the video.
          This lets the video's audio play after the user interacted (browsers require user gesture).
      */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowModal(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative z-50 w-[min(720px,90%)] max-w-2xl rounded-2xl bg-white/5 backdrop-blur-sm p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-semibold mb-4">Welcome — choose login</h2>
            <p className="text-sm text-white/70 mb-6">Are you a customer or the owner?</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/login?role=customer')}
                className="w-56 px-6 py-3 rounded-2xl bg-white text-zinc-900 text-lg font-medium shadow"
              >
                Customer
              </button>

              <button
                onClick={() => router.push('/owner-login')}
                className="w-56 px-6 py-3 rounded-2xl bg-transparent border border-white/30 text-white text-lg font-medium"
              >
                Owner
              </button>
            </div>

            <div className="mt-6 text-xs text-white/60">Tap outside to cancel</div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-gradient {
          background-size: 400% 400%;
          animation: gradient 12s ease infinite;
        }

        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}
