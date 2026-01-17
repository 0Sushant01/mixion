export const metadata = {
  title: 'MIXION — Signage',
  description: 'Cinematic full-screen signage for MIXION kiosk',
};

export default function Signage() {
  return (
    <div className="min-h-screen w-full relative bg-black text-white overflow-hidden flex items-center justify-center">
      {/* Atmospheric radial lights */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-36 -top-20 w-[1200px] h-[1200px] rounded-full bg-gradient-to-r from-cyan-500/10 via-violet-400/6 to-transparent blur-3xl opacity-80 animate-slow-rotate" />
        <div className="absolute -right-36 -bottom-20 w-[1000px] h-[1000px] rounded-full bg-gradient-to-r from-magenta-500/8 via-purple-400/6 to-transparent blur-3xl opacity-70 animate-rotate-reverse" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-white/3 to-transparent mix-blend-screen opacity-40" />
      </div>

      {/* Neon Rings (SVG) */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full -z-20" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow)" transform="translate(960,540)">
          <g className="animate-ring-1" transform="scale(1)">
            <circle r="280" fill="none" stroke="rgba(0,255,255,0.12)" strokeWidth="18" />
            <circle r="340" fill="none" stroke="rgba(255,0,255,0.08)" strokeWidth="14" />
            <circle r="420" fill="none" stroke="rgba(120,0,255,0.06)" strokeWidth="10" />
          </g>
        </g>
      </svg>

      {/* Bubbles and floating particles */}
      <svg className="absolute -z-10 w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1">
          <circle cx="450" cy="720" r="6" className="bubble animate-bubble-1 fill-white/10" />
          <circle cx="1400" cy="600" r="8" className="bubble animate-bubble-2 fill-white/8" />
          <circle cx="900" cy="820" r="5" className="bubble animate-bubble-3 fill-white/7" />
          <circle cx="1200" cy="300" r="10" className="bubble animate-bubble-4 fill-white/6" />
        </g>
      </svg>

      {/* Central glass sheen / subtle glass silhouette */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 py-12">
        <div className="relative w-[720px] max-w-[92vw] aspect-[3/1] flex items-center justify-center">
          {/* Glass vignette & reflection */}
          <div className="absolute inset-0 rounded-3xl bg-white/3 backdrop-blur-[6px] border border-white/8 shadow-[0_20px_80px_rgba(0,0,0,0.6)]" />

          {/* Drink area (artful) */}
          <div className="relative z-20 w-full h-full flex items-center justify-center">
            <div className="relative w-3/4 h-4/5 flex items-center justify-center">
              {/* Stylized glass (SVG) */}
              <svg viewBox="0 0 240 320" className="w-full h-full">
                <defs>
                  <linearGradient id="liquid" x1="0" x2="1">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.95" />
                    <stop offset="60%" stopColor="#7C4DFF" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#FF3CA6" stopOpacity="0.85" />
                  </linearGradient>
                  <filter id="liquidBlur">
                    <feGaussianBlur stdDeviation="6" />
                  </filter>
                </defs>

                {/* Glass outline */}
                <g transform="translate(20,10)">
                  <path d="M40 10 q80 0 120 0 q-10 30 -30 120 q-40 60 -60 60 q-20 0 -60 -60 q-20 -90 -30 -120" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

                  {/* Liquid (animated wave mask) */}
                  <g clipPath="url(#glassClip)">
                    <path d="M0 180 q30 -50 60 -30 t60 20 t60 -40 v120 h-180 z" fill="url(#liquid)" opacity="0.95" transform="translate(0,10)" style={{ mixBlendMode: 'screen' }} />
                    <g filter="url(#liquidBlur)">
                      <ellipse cx="120" cy="160" rx="70" ry="18" fill="#ffffff22" />
                    </g>
                  </g>

                  {/* Ice cubes (stylized) */}
                  <rect x="70" y="80" width="26" height="18" rx="3" fill="#ffffff33" transform="rotate(-12 83 89)" />
                  <rect x="110" y="70" width="28" height="20" rx="4" fill="#ffffff2a" transform="rotate(8 124 80)" />

                  {/* Mint leaf */}
                  <path d="M170 60 c-8 -12 -28 -12 -40 0 c12 8 18 20 40 28 c-10 -8 -8 -20 0 -28" fill="#8EFFB0" opacity="0.95" />

                </g>
                {/* A subtle splash highlight */}
                <g transform="translate(0,0)" opacity="0.9">
                  <path d="M140 86 q8 -12 18 -14" stroke="#ffffff66" strokeWidth="2" fill="none" strokeLinecap="round" />
                </g>

                <defs>
                  <clipPath id="glassClip">
                    <rect x="0" y="0" width="240" height="240" />
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>

          {/* Brand wordmark overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
            <h1 className="relative text-[clamp(48px,7.5vw,120px)] tracking-widest font-extrabold leading-none" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' }}>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-200 drop-shadow-[0_6px_20px_rgba(0,255,255,0.18)]" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.03)' }}>
                MIXION
              </span>

              {/* Glow layer */}
              <span aria-hidden className="absolute inset-0 text-[inherit] mix-blend-screen opacity-60 blur-[18px] -z-10">MIXION</span>

              {/* Reflection sheen */}
              <span aria-hidden className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-white/60 via-white/12 to-transparent h-6 opacity-15 rounded-lg -z-5" />
            </h1>
          </div>
        </div>

        {/* Bottom ambient bar (very subtle) */}
        <div className="mt-8 w-full max-w-[880px] opacity-20 pointer-events-none">
          <div className="h-1 rounded-full bg-gradient-to-r from-cyan-400 via-magenta-400 to-violet-400 shadow-[0_8px_40px_rgba(124,77,255,0.16)]" />
        </div>
      </div>

      {/* Decorative CSS (keyframes + helper classes) */}
      <style>{`
        .animate-rotate-reverse{animation: rotateRev 40s linear infinite}
        .animate-slow-rotate{animation: rotate 48s linear infinite}
        @keyframes rotate {from{transform:translateZ(0) rotate(0deg)}to{transform:translateZ(0) rotate(360deg)}}
        @keyframes rotateRev {from{transform:translateZ(0) rotate(0deg)}to{transform:translateZ(0) rotate(-360deg)}}

        .animate-ring-1{animation: ringPulse 6s ease-in-out infinite}
        @keyframes ringPulse{0%{opacity:0.8;transform:scale(0.98)}50%{opacity:1;transform:scale(1.02)}100%{opacity:0.8;transform:scale(0.98)}}

        .bubble{opacity:0.9;filter:drop-shadow(0 6px 16px rgba(0,0,0,0.45))}
        .animate-bubble-1{animation: bubbleRise 10s linear infinite; transform-origin: center}
        .animate-bubble-2{animation: bubbleRise 12s linear infinite; animation-delay:2s}
        .animate-bubble-3{animation: bubbleRise 9s linear infinite; animation-delay:1s}
        .animate-bubble-4{animation: bubbleRise 14s linear infinite; animation-delay:3s}
        @keyframes bubbleRise{0%{transform:translateY(30px) scale(0.9);opacity:0}10%{opacity:0.7}50%{opacity:1;transform:translateY(-160px) scale(1.05)}100%{opacity:0; transform:translateY(-300px) scale(1.1)}}

        h1 span{letter-spacing:0.02em}
        .rounded-3xl{border-radius:1rem}
      `}</style>
    </div>
  );
}
