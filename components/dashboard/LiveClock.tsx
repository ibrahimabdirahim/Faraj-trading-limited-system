"use client";
import { useEffect, useState } from "react";
import { fmtTime } from "@/lib/format";

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Starting at null (rendered as nothing) and setting the real time only after mount
    // avoids a server/client mismatch — the server has no meaningful "current time" to
    // render for a clock that's supposed to show the viewer's own clock.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;
  return <>{fmtTime(now)}</>;
}
