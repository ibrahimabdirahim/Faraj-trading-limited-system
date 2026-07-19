"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Icon from "@/components/shared/Icon";
import ThemeToggle from "@/components/layout/ThemeToggle";
import NewReportButton from "@/components/daily-reports/NewReportButton";
import { timeAgo } from "@/lib/format";
import type { SearchResult } from "@/lib/search";

const DEBOUNCE_MS = 200;

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (!query) return;
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => { setResults(data.results ?? []); setLoading(false); setActiveIndex(-1); })
        .catch((e) => { if (e.name !== "AbortError") setLoading(false); });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  function onChangeQuery(v: string) {
    setQ(v);
    setOpen(true);
    if (!v.trim()) { setResults([]); setLoading(false); }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
    }
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => { document.removeEventListener("keydown", onKeyDown); document.removeEventListener("mousedown", onClickOutside); };
  }, []);

  const goTo = useCallback((r: SearchResult) => {
    setOpen(false); setQ(""); setResults([]);
    router.push(r.href);
  }, [router]);

  function onKeyDownInput(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter" && activeIndex >= 0 && results[activeIndex]) { goTo(results[activeIndex]); }
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.module] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="search" ref={boxRef} style={{ position: "relative" }}>
      <Icon name="search" size={15} />
      <input
        ref={inputRef}
        placeholder="Search branches, products, reports…"
        value={q}
        onChange={(e) => onChangeQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDownInput}
      />
      <span className="kbd">⌘K</span>

      {open && q.trim() && (
        <div className="search-results">
          {loading ? (
            <div className="search-results-empty">Searching…</div>
          ) : results.length === 0 ? (
            <div className="search-results-empty">No results for &quot;{q.trim()}&quot;</div>
          ) : (
            Object.entries(grouped).map(([module, rows]) => (
              <div key={module} className="search-results-group">
                <div className="search-results-label">{module}</div>
                {rows.map((r) => {
                  const idx = results.indexOf(r);
                  return (
                    <button
                      key={`${r.module}-${r.id}`}
                      className={`search-result-item${idx === activeIndex ? " active" : ""}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => goTo(r)}
                    >
                      <div className="search-result-title">{r.title}</div>
                      <div className="search-result-sub">
                        {r.subtitle}
                        {r.status && <span className="search-result-status">{r.status}</span>}
                        {r.createdAt && <span className="search-result-time">{timeAgo(new Date(r.createdAt))}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Topbar({ hasNotifications }: { hasNotifications: boolean }) {
  const path = usePathname();
  const inSuppliers = path.startsWith("/suppliers");

  return (
    <header className="topbar">
      <GlobalSearch />
      <div className="top-actions">
        <button className="icon-btn" title="Notifications" aria-label="Notifications">
          {hasNotifications && <span className="dot" />}
          <Icon name="bell" size={18} />
        </button>
        <ThemeToggle />
        {!inSuppliers && <NewReportButton />}
      </div>
    </header>
  );
}
