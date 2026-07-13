// Pure SVG charts — server-renderable, theme-aware via CSS variables.
import React from "react";

export function Spark({ data, w = 120, h = 44, color = "var(--brand)", fill = true }: { data: number[]; w?: number; h?: number; color?: string; fill?: boolean }) {
  if (!data.length) data = [0, 0];
  const mn = Math.min(...data), mx = Math.max(...data), rg = mx - mn || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1 || 1)) * w, h - 6 - ((v - mn) / rg) * (h - 14)] as [number, number]);
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
        const gid = "grad" + si + "-" + Math.round(Math.random() * 1e6);
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

export function BarChart({ data, w = 560, h = 210 }: { data: { name: string; lab: string; v: number; color: string }[]; w?: number; h?: number }) {
  const mx = Math.max(1, ...data.map((d) => d.v)) * 1.15;
  const pad = { l: 8, r: 8, t: 10, b: 34 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const bw = (iw / (data.length || 1)) * 0.5;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      {data.map((d, i) => {
        const x = pad.l + ((i + 0.5) / data.length) * iw - bw / 2;
        const bh = (d.v / mx) * ih, y = pad.t + ih - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="5" fill={d.color} opacity="0.92" />
            <text x={x + bw / 2} y={y - 6} fontSize="10.5" fontWeight="600" fill="var(--text-2)" textAnchor="middle">{d.lab}</text>
            <text x={x + bw / 2} y={h - 10} fontSize="10.5" fill="var(--faint)" textAnchor="middle">{d.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Donut({ data, size = 150, centerTop, centerSub }: { data: { v: number; color: string }[]; size?: number; centerTop: string; centerSub: string }) {
  const r = size / 2 - 14, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
  const tot = data.reduce((a, b) => a + b.v, 0) || 1;
  let off = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="16" />
      {data.map((d, i) => {
        const len = (d.v / tot) * C;
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`} />;
        off += len;
        return el;
      })}
      <text x={cx} y={cy - 2} fontSize="16" fontWeight="700" fill="var(--text)" textAnchor="middle">{centerTop}</text>
      <text x={cx} y={cy + 15} fontSize="10" fill="var(--muted)" textAnchor="middle">{centerSub}</text>
    </svg>
  );
}
