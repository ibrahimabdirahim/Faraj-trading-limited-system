"use client";
import { useEffect, useState } from "react";
import Icon from "./Icon";

type T = { id: number; title: string; message: string; type: "ok" | "err" };

export default function ToastHost() {
  const [toasts, setToasts] = useState<T[]>([]);
  useEffect(() => {
    let id = 0;
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const t: T = { id: ++id, title: d.title, message: d.message ?? "", type: d.type ?? "ok" };
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3400);
    };
    window.addEventListener("faraj:toast", handler);
    return () => window.removeEventListener("faraj:toast", handler);
  }, []);

  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type === "err" ? "err" : ""}`}>
          <div className="tico"><Icon name={t.type === "err" ? "alert" : "check"} size={18} stroke={2.4} /></div>
          <div><b>{t.title}</b>{t.message && <p>{t.message}</p>}</div>
        </div>
      ))}
    </div>
  );
}
