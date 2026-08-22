"use client";

import { useId, useState } from "react";

interface TrendPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  title: string;
  periodLabel: string;
  unitLabel: string;
  data: TrendPoint[];
  // A plain suffix (e.g. "%"), not a formatter function — functions can't
  // cross the Server->Client boundary as props (see lib/nav.ts's NAV_ITEMS
  // for the same constraint with component values).
  valueSuffix?: string;
}

const WIDTH = 600;
const HEIGHT = 220;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

export function TrendChart({
  title,
  periodLabel,
  unitLabel,
  data,
  valueSuffix,
}: TrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();
  const formatValue = (value: number) =>
    valueSuffix ? `${value}${valueSuffix}` : value.toLocaleString();

  const values = data.map((d) => d.value);
  const niceMax = Math.ceil(Math.max(...values) / 50) * 50;
  const niceMin = Math.floor(Math.min(...values) / 50) * 50;

  function xAt(index: number) {
    return PAD_LEFT + (PLOT_WIDTH * index) / (data.length - 1);
  }
  function yAt(value: number) {
    const ratio = (value - niceMin) / (niceMax - niceMin || 1);
    return PAD_TOP + PLOT_HEIGHT * (1 - ratio);
  }

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(d.value)}`)
    .join(" ");
  const areaPath = `${linePath} L ${xAt(data.length - 1)} ${PAD_TOP + PLOT_HEIGHT} L ${xAt(0)} ${PAD_TOP + PLOT_HEIGHT} Z`;

  const ticks = [niceMin, (niceMin + niceMax) / 2, niceMax];
  const last = data[data.length - 1];
  const active = activeIndex !== null ? data[activeIndex] : null;
  const shownIndex = activeIndex ?? data.length - 1;
  const shown = active ?? last;

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg text-ink dark:text-paper">{title}</h3>
        <p className="font-body text-sm text-ink/50 dark:text-paper/50">{periodLabel}</p>
      </div>

      <div className="relative mt-4 [--chart-surface:var(--color-paper)] [--chart-grid:color-mix(in_srgb,var(--color-ink)_8%,transparent)] dark:[--chart-grid:color-mix(in_srgb,var(--color-paper)_10%,transparent)] dark:[--chart-surface:var(--color-slate)]">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={`${title}: line chart from ${data[0].label} to ${last.label}, ending at ${formatValue(last.value)} ${unitLabel}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-green)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--color-chart-green)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 10}
                y={yAt(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-ink/40 font-utility text-[10px] dark:fill-paper/40"
              >
                {formatValue(tick)}
              </text>
            </g>
          ))}

          {activeIndex !== null && (
            <line
              x1={xAt(activeIndex)}
              x2={xAt(activeIndex)}
              y1={PAD_TOP}
              y2={PAD_TOP + PLOT_HEIGHT}
              stroke="var(--chart-grid)"
              strokeWidth={1}
            />
          )}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-chart-green)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <circle cx={xAt(shownIndex)} cy={yAt(shown.value)} r={6} fill="var(--chart-surface)" />
          <circle cx={xAt(shownIndex)} cy={yAt(shown.value)} r={4} fill="var(--color-chart-green)" />

          {data.map((d, i) => (
            <text
              key={d.label}
              x={xAt(i)}
              y={HEIGHT - 6}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              className="fill-ink/45 font-utility text-[10px] dark:fill-paper/45"
            >
              {d.label}
            </text>
          ))}

          <text
            x={xAt(data.length - 1)}
            y={yAt(last.value) - 12}
            textAnchor="end"
            className="fill-ink font-body text-xs font-semibold dark:fill-paper"
          >
            {formatValue(last.value)}
          </text>
        </svg>

        <div
          className="absolute inset-0 flex"
          style={{
            paddingLeft: `${(PAD_LEFT / WIDTH) * 100}%`,
            paddingRight: `${(PAD_RIGHT / WIDTH) * 100}%`,
          }}
        >
          {data.map((d, i) => (
            <button
              key={d.label}
              type="button"
              className="h-full flex-1 focus-visible:outline-none"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(i)}
              onBlur={() => setActiveIndex(null)}
              aria-label={`${d.label}: ${formatValue(d.value)} ${unitLabel}`}
            />
          ))}
        </div>

        {active && (
          <div
            className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-lg border border-ink/10 bg-paper px-3 py-2 shadow-lg dark:border-paper/15 dark:bg-ink"
            style={{ left: `${(xAt(activeIndex ?? 0) / WIDTH) * 100}%` }}
          >
            <p className="font-utility text-[10px] uppercase tracking-wide text-ink/45 dark:text-paper/50">
              {active.label}
            </p>
            <p className="font-body text-sm font-semibold text-ink dark:text-paper">
              {formatValue(active.value)}{" "}
              <span className="font-normal text-ink/50 dark:text-paper/50">{unitLabel}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
