"use client";

import { cn } from "@/lib/utils";

export interface MiniChartItem {
  label: string;
  value: number;
  hint?: string;
}

export function MiniBarChart({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: MiniChartItem[];
}) {
  const safeItems = items.filter((item) => Number.isFinite(item.value));

  if (safeItems.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-md p-5">
        <div className="mb-2">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-foreground">{title}</h3>
          {description ? (
            <p className="text-sm text-slate-500 dark:text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <p className="text-sm text-slate-500 dark:text-muted-foreground">
          Belum ada data transaksi pada periode ini.
        </p>
      </div>
    );
  }

  const values = safeItems.map((item) => item.value);
  const rawMax = Math.max(...values.map(Math.abs));
  const padding = rawMax * 0.15 || 1;
  const absMax = rawMax + padding;

  const chartHeight = 220;
  const chartWidth = 960;
  const padTop = 30;
  const padRight = 30;
  const padBottom = 40;
  const padLeft = 20;

  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const hasNegative = values.some((v) => v < 0);
  const baselineRatio = hasNegative ? 0.5 : 1;
  const baselineY = padTop + baselineRatio * plotHeight;

  const getPoint = (value: number, index: number) => {
    const x = padLeft + (index / (safeItems.length - 1 || 1)) * plotWidth;
    const ratio = Math.abs(value) / absMax;
    const h = ratio * (hasNegative ? plotHeight / 2 : plotHeight);
    const y = value >= 0 ? baselineY - h : baselineY + h;
    return { x, y };
  };

  const points = safeItems.map((item, i) => getPoint(item.value, i));
  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

  // Create area path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const ratio = i / tickCount;
    const value = hasNegative ? absMax - ratio * absMax * 2 : absMax - ratio * absMax;
    const y = padTop + ratio * plotHeight;
    return { y, value };
  });

  const formatAxisValue = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  return (
    <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-md p-5">
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-slate-500 dark:text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/30 p-3">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-60 w-full" role="img">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="areaGradientNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {ticks.map((tick) => (
              <g key={tick.y}>
                <line
                  x1={padLeft}
                  y1={tick.y}
                  x2={chartWidth - padRight}
                  y2={tick.y}
                  stroke="currentColor"
                  className="text-slate-200/80 dark:text-white/10"
                  strokeWidth="1"
                />
                <text
                  x={padLeft + 4}
                  y={tick.y - 4}
                  className="fill-slate-400 dark:fill-slate-500"
                  fontSize="14"
                >
                  {formatAxisValue(tick.value)}
                </text>
              </g>
            ))}

            {/* Zero baseline */}
            <line
              x1={padLeft}
              y1={baselineY}
              x2={chartWidth - padRight}
              y2={baselineY}
              stroke="currentColor"
              className="text-slate-400 dark:text-white/30"
              strokeWidth="2"
            />

            {/* Area fill */}
            <path d={areaPath} fill="url(#areaGradient)" className="pointer-events-none" />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  className="fill-white dark:fill-slate-900 stroke-emerald-500"
                  strokeWidth="3"
                />
                <text
                  x={p.x}
                  y={p.y - 12}
                  textAnchor="middle"
                  className="fill-emerald-700 dark:fill-emerald-300 font-bold"
                  fontSize="12"
                >
                  {formatAxisValue(safeItems[i].value)}
                </text>
              </g>
            ))}
          </svg>

          {/* X-axis labels */}
          <div className="mt-2 flex justify-between px-[20px] pr-[30px]">
            {safeItems.map((item) => (
              <span
                key={item.label}
                className="text-[11px] font-semibold text-slate-500 dark:text-muted-foreground"
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {safeItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                "rounded-xl border px-3 py-2",
                item.value >= 0
                  ? "border-emerald-200/70 dark:border-emerald-800/30 bg-emerald-50/60 dark:bg-emerald-950/20"
                  : "border-rose-200/70 dark:border-rose-800/30 bg-rose-50/60 dark:bg-rose-950/20"
              )}
            >
              <p className="text-xs text-slate-500 dark:text-muted-foreground">{item.label}</p>
              <p className={cn("text-sm font-bold", item.value >= 0 ? "text-emerald-700" : "text-rose-700")}>
                {item.hint ?? String(item.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}