"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/shared/Icon";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    // Reading the real theme in an effect (rather than a lazy useState initializer) is
    // intentional: the initializer runs during SSR too, where `document` doesn't exist,
    // and guessing the client value there would make this render's icon mismatch the
    // server-rendered HTML. Starting at "light" and correcting after mount avoids that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme((document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("faraj-theme", next); } catch {}
    setTheme(next);
  };
  return (
    <button className="icon-btn" onClick={toggle} title="Toggle theme" aria-label="Toggle theme">
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}
