"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  timeoutSeconds?: number;
  onTimeout: () => void;
};

export default function IdleTimer({ timeoutSeconds = 15, onTimeout }: Props) {
  const timerRef = useRef<number | null>(null);
  const [remaining, setRemaining] = useState(timeoutSeconds);

  useEffect(() => {
    function reset() {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setRemaining(timeoutSeconds);
      // count down each second
      timerRef.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            if (timerRef.current) window.clearInterval(timerRef.current);
            onTimeout();
            return 0;
          }
          return r - 1;
        });
      }, 1000) as unknown as number;
    }

    function handleActivity() {
      reset();
    }

    // Listen for a wide set of user interactions
    const events = ["pointerdown", "touchstart", "mousemove", "keydown", "mousedown"];
    events.forEach((ev) => window.addEventListener(ev, handleActivity));

    // start
    reset();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [timeoutSeconds, onTimeout]);

  return (
    <div className="text-xs text-gray-400">Auto logout in {remaining}s</div>
  );
}
