// Pure SVG charts — server-renderable, theme-aware via CSS variables.
import React, { useId } from "react";

export function Spark({ data, w = 120, h = 44, color = "var(--brand)", fill = true }: { data: number[]; w?: number; h?: number; color?: string; fill?: boolean }) {
  const points = data.length ? data : [0, 0];
  const mn = Math.min(...points), mx = Math.max(...points), rg = mx - mn || 1;
  const pts = points.map((v, i) => [(i / (points.length - 1 || 1)) * w, h - 6 - ((v - mn) / rg) * (h - 14)] as [number, number]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const end = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      {fill && <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={color} opacity="0.10" />}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={end[0]} cy={end[1]} r="2.6" fill={color} />
    </svg>
  );
}

const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AreaChart({ series, labels = LABELS, w = 560, h = 200 }: { series: { data: number[]; color: string }[]; labels?: string[]; w?: number; h?: number }) {
  const gradientBaseId = useId();
  const all = series.flatMap((s) => s.data);
  const mx = (Math.max(1, ...all)) * 1.12;
  const pad = { l: 8, r: 8, t: 12, b: 24 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const n = series[0]?.data.length ?? 1;
  const X = (i: number) => pad.l + (i / (n - 1 || 1)) * iw;
  const Y = (v: number) => pad.t + ih - (v / mx) * ih;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      {[0, 1, 2, 3].map((g) => <line key={g} x1={pad.l} x2={w - pad.r} y1={pad.t + (ih * g) / 3} y2={pad.t + (ih * g) / 3} stroke="var(--border)" strokeWidth="1" />)}
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => [X(i), Y(v)] as [number, number]);
        const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
        const gid = `${gradientBaseId}-grad${si}`;
        return (
          <g key={si}>
            <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={s.color} stopOpacity="0.26" /><stop offset="1" stopColor={s.color} stopOpacity="0" /></linearGradient></defs>
            <path d={`${d} L${X(n - 1)} ${pad.t + ih} L${X(0)} ${pad.t + ih} Z`} fill={`url(#${gid})`} />
            <path d={d} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill="var(--surface)" stroke={s.color} strokeWidth="1.6" />)}
          </g>
        );
      })}
      {labels.slice(0, n).map((l, i) => <text key={i} x={X(i)} y={h - 6} fontSize="10.5" fill="var(--faint)" textAnchor="middle">{l}</text>)}
    </svg>
  );
}

