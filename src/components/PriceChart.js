// Lightweight SVG chart: recent prices (solid) + forecast (dashed) with a shaded range.
import React from "react";
import { useI18n } from "../i18n";

const W = 600;
const H = 220;
const PAD = { l: 44, r: 12, t: 12, b: 28 };

export default function PriceChart({ prediction }) {
  const { t } = useI18n();
  const today = new Date(prediction.asOf);
  const dayOffset = (date) => Math.round((new Date(date) - today) / 864e5);

  const past = prediction.history.map((p) => ({ x: dayOffset(p.date), y: p.perKg })).filter((p) => p.x <= 0);
  const now = { x: 0, y: prediction.current.perKg };
  if (!past.length || past[past.length - 1].x !== 0) past.push(now);
  const future = [now, ...prediction.forecasts.map((f) => ({ x: f.days, y: f.perKg, lo: f.lowPerKg, hi: f.highPerKg }))];

  const xs = [...past, ...future].map((p) => p.x);
  const ys = [...past.map((p) => p.y), ...future.flatMap((p) => [p.y, p.lo ?? p.y, p.hi ?? p.y])];
  const minX = Math.min(...xs, -7);
  const maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  const padY = (maxY - minY) * 0.1 || maxY * 0.1 || 1;
  minY = Math.max(0, minY - padY);
  maxY += padY;

  const sx = (x) => PAD.l + ((x - minX) / (maxX - minX || 1)) * (W - PAD.l - PAD.r);
  const sy = (y) => H - PAD.b - ((y - minY) / (maxY - minY || 1)) * (H - PAD.t - PAD.b);
  const line = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const band =
    future.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.hi ?? p.y).toFixed(1)}`).join(" ") +
    " " +
    [...future].reverse().map((p) => `L${sx(p.x).toFixed(1)},${sy(p.lo ?? p.y).toFixed(1)}`).join(" ") +
    " Z";
  const ticks = [minY, (minY + maxY) / 2, maxY];

  return (
    <div className="chart-wrap" role="img" aria-label={t("priceTrend")}>
      <svg viewBox={`0 0 ${W} ${H}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} stroke="#e5e7eb" />
            <text x={PAD.l - 6} y={sy(v) + 4} fontSize="12" textAnchor="end" fill="#6b7280">₹{v.toFixed(v < 10 ? 1 : 0)}</text>
          </g>
        ))}
        <line x1={sx(0)} x2={sx(0)} y1={PAD.t} y2={H - PAD.b} stroke="#9ca3af" strokeDasharray="3 3" />
        <path d={band} fill="rgba(245, 158, 11, 0.18)" />
        {past.length > 1 && <path d={line(past)} fill="none" stroke="#15803d" strokeWidth="3" />}
        <path d={line(future)} fill="none" stroke="#d97706" strokeWidth="3" strokeDasharray="7 5" />
        <circle cx={sx(0)} cy={sy(now.y)} r="6" fill="#15803d" />
        <text x={sx(0)} y={H - 8} fontSize="12" textAnchor="middle" fill="#374151">{t("today")}</text>
        {prediction.forecasts.map((f) => (
          <text key={f.days} x={sx(f.days)} y={H - 8} fontSize="12" textAnchor="middle" fill="#6b7280">+{f.days}d</text>
        ))}
      </svg>
      <div className="row-wrap small muted">
        <span><span style={{ color: "#15803d", fontWeight: 800 }}>━</span> {t("chartPast")}</span>
        <span><span style={{ color: "#d97706", fontWeight: 800 }}>┅</span> {t("chartForecast")}</span>
      </div>
    </div>
  );
}
