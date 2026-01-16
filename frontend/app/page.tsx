"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  function handleAnyClick() {
    const vid = document.getElementById("idle-video") as HTMLVideoElement | null;
    if (vid) {
      try {
        vid.muted = false;
        vid.play().catch(() => {
          /* ignore play errors */
        });
      } catch {
        // ignore
      }
    }
    router.push("/products");
  }

  return (
    <div
      onClick={handleAnyClick}
      className="relative h-[70vh] w-full cursor-pointer select-none overflow-hidden rounded-none bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#7C3AED] text-white sm:h-[80vh] sm:rounded-3xl lg:h-[85vh] shadow-2xl animate-in fade-in"
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-gradient absolute inset-0 bg-gradient-to-tr from-[#7C3AED] via-[#FACC15] to-[#7C3AED] opacity-40" />
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="g" x1="0" x2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.04" />
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
          Your browser does not support HTML5 video.
        </video>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-2xl sm:text-5xl animate-in fade-in slide-in">
            MIXION
          </h1>
          <p className="mt-4 text-base text-white/90 sm:text-lg font-medium animate-in fade-in slide-in">Touch anywhere to begin</p>
        </div>
      </div>

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
