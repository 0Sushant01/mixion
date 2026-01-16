"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  timeoutSeconds?: number;
  onTimeout: () => void;
};

export default function IdleTimer({ timeoutSeconds = 15, onTimeout }: Props) {
  const timerRef = useRef<number | null>(null);
  const callbackRef = useRef(onTimeout);
  const [remaining, setRemaining] = useState(timeoutSeconds);

  useEffect(() => {
    callbackRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    function reset() {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setRemaining(timeoutSeconds);
      timerRef.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            if (timerRef.current) window.clearInterval(timerRef.current);
            // Call callback asynchronously to avoid React state update during render
            setTimeout(() => callbackRef.current(), 0);
            return 0;
          }
          return r - 1;
        });
      }, 1000) as unknown as number;
    }

    function handleActivity() {
      reset();
    }

    const events = ["pointerdown", "touchstart", "mousemove", "keydown", "mousedown"];
    events.forEach((ev) => window.addEventListener(ev, handleActivity));

    reset();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [timeoutSeconds]);

  return <div className="text-xs text-gray-400">Auto logout in {remaining}s</div>;
}
