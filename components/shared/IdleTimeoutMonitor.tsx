"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/shared/Icon";
import { touchSession } from "@/app/actions";
import { IDLE_WARNING_MS, IDLE_LOGOUT_MS } from "@/lib/idleTimeout";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
const SERVER_TOUCH_MIN_INTERVAL_MS = 60 * 1000;

async function signOut(reason: string) {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = `/login?reason=${reason}`;
}

export default function IdleTimeoutMonitor() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastActivityRef = useRef(0);
  const lastServerTouchRef = useRef(0);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    lastServerTouchRef.current = Date.now();

    function onActivity() {
      lastActivityRef.current = Date.now();
      if (Date.now() - lastServerTouchRef.current > SERVER_TOUCH_MIN_INTERVAL_MS) {
        lastServerTouchRef.current = Date.now();
        touchSession().then((res) => { if (!res.ok) signOut("expired"); });
      }
    }
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const interval = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_LOGOUT_MS) {
        signOut("idle");
      } else if (idleFor >= IDLE_WARNING_MS) {
        setSecondsLeft(Math.max(0, Math.round((IDLE_LOGOUT_MS - idleFor) / 1000)));
      } else {
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(interval);
    };
  }, []);

  function stayCurrent() {
    lastActivityRef.current = Date.now();
    lastServerTouchRef.current = Date.now();
    setSecondsLeft(null);
    touchSession();
  }

  if (secondsLeft === null) return null;

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-head"><Icon name="alert" size={20} stroke={2} /><h3>Still there?</h3></div>
        <div className="modal-body">
          <p style={{ fontSize: 13.5 }}>You&apos;ve been inactive. For your security, you&apos;ll be signed out in <b>{secondsLeft}s</b>.</p>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={() => signOut("idle")}>Sign out now</button>
          <div className="spacer" />
          <button className="btn btn-primary" onClick={stayCurrent}>Stay signed in</button>
        </div>
      </div>
    </div>
  );
}
