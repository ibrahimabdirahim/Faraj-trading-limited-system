"use client";
import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/format";

// Animates from 0 to `value` over ~900ms using an eased curve. Purely cosmetic — the final
// rendered number is always the real value, this just makes it count up on load.
export default function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    let raf = 0;
    const duration = 900;
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{fmt(display)}</>;
}
