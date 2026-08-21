"use client";

import { useEffect, useRef } from "react";
import { createScope, createTimeline, stagger, svg, utils } from "animejs";

const COLS = 7;
const ROWS = 11;
const MARGIN_X = 26;
const MARGIN_Y = 28;
const GAP_X = 38;
const GAP_Y = 32;
const RADIUS = 4;
const VIEW_W = 280;
const VIEW_H = 380;

const SCAN_TOP = 12;
const SCAN_BOTTOM = MARGIN_Y + (ROWS - 1) * GAP_Y + 14;
const SCAN_DURATION = 1300;
const MARK_START = 1000;
const MARK_DURATION = 500;
const CARD_START = 1350;
const CARD_DURATION = 400;
const SCORE_START = 1850;
const SCORE_DURATION = 450;
const HOLD_MS = 2000;
const RESET_START = SCORE_START + SCORE_DURATION + HOLD_MS;
const RESET_DURATION = 450;

// Deliberately picked, not hashed — index 58 sits inside the region the
// red-pen mark circles, so the mark visibly points at a wrong answer rather
// than an arbitrary cluster. Row-major, 7 cols x 11 rows (indices 0-76).
const RED_INDICES = [6, 15, 24, 58, 67];
const GREEN_INDICES = [2, 9, 13, 20, 28, 33, 37, 41, 45, 49, 55, 63, 70, 74];
const SCORE = Math.round(
  (GREEN_INDICES.length / (GREEN_INDICES.length + RED_INDICES.length)) * 100
);

const GRADE = new Map<number, "green" | "red">();
RED_INDICES.forEach((i) => GRADE.set(i, "red"));
GREEN_INDICES.forEach((i) => GRADE.set(i, "green"));
const GRADED_COUNT = GRADE.size;

export function BubbleField() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const scope = createScope({ root: rootRef.current }).add(() => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reduceMotion) {
        utils.set(".bubble-fill", { opacity: 1 });
        utils.set(".mark-path", { opacity: 1 });
        utils.set(".annotation-card", { opacity: 1, translateY: 0 });
        utils.set(".score-badge", { opacity: 1, scale: 1 });
        return;
      }

      const tl = createTimeline({ loop: true, defaults: { ease: "outQuad" } });

      tl.add(
        ".scan-line",
        {
          translateY: [0, SCAN_BOTTOM - SCAN_TOP],
          duration: SCAN_DURATION,
          ease: "linear",
        },
        0
      )
        .add(
          ".bubble-fill",
          {
            opacity: [0, 1],
            scale: [0.4, 1],
            duration: 260,
            delay: stagger(SCAN_DURATION / GRADED_COUNT),
            ease: "outQuad",
          },
          0
        )
        .add(svg.createDrawable(".mark-path"), { draw: "0 1", duration: MARK_DURATION }, MARK_START)
        .add(
          ".annotation-card",
          { opacity: [0, 1], translateY: [10, 0], duration: CARD_DURATION },
          CARD_START
        )
        .add(
          ".score-badge",
          { opacity: [0, 1], scale: [0.85, 1], duration: SCORE_DURATION },
          SCORE_START
        )
        .add(
          [".bubble-fill", ".mark-path", ".annotation-card", ".score-badge"],
          { opacity: 0, duration: RESET_DURATION },
          RESET_START
        );
    });

    return () => scope.revert();
  }, []);

  const dots = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      const cx = MARGIN_X + col * GAP_X;
      const cy = MARGIN_Y + row * GAP_Y;
      const grade = GRADE.get(index);
      dots.push(
        <g key={index}>
          <circle
            cx={cx}
            cy={cy}
            r={RADIUS}
            fill="none"
            stroke="color-mix(in srgb, var(--color-paper) 28%, transparent)"
            strokeWidth={1.4}
          />
          {grade && (
            <circle
              className="bubble-fill"
              cx={cx}
              cy={cy}
              r={RADIUS}
              fill={grade === "green" ? "var(--color-chart-green)" : "var(--color-mark)"}
              style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
            />
          )}
        </g>
      );
    }
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-6">
      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full max-w-[260px]"
          role="presentation"
          aria-hidden="true"
        >
          {dots}

          <g className="scan-line" style={{ transformBox: "fill-box" }}>
            <rect
              x={0}
              y={SCAN_TOP}
              width={VIEW_W}
              height={16}
              fill="var(--color-chart-green)"
              opacity={0.14}
            />
            <rect
              x={0}
              y={SCAN_TOP}
              width={VIEW_W}
              height={2}
              fill="var(--color-chart-green)"
              opacity={0.85}
            />
          </g>

          <path
            className="mark-path"
            d="M 52 268 C 48 240, 78 222, 108 226 C 142 230, 158 254, 150 280 C 144 302, 112 314, 84 306 C 60 300, 48 288, 52 268 Z"
            fill="none"
            stroke="var(--color-mark)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </svg>

        <div className="score-badge pointer-events-none absolute inset-0 flex items-center justify-center opacity-0">
          <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-paper/20 bg-ink/90 px-6 py-4 shadow-xl backdrop-blur-sm">
            <span className="font-utility text-[10px] font-medium uppercase tracking-[0.14em] text-paper/50">
              Auto-graded
            </span>
            <span className="font-body text-4xl font-bold text-paper">{SCORE}%</span>
          </div>
        </div>
      </div>

      <div className="annotation-card max-w-[260px] rounded-2xl border border-paper/15 bg-paper/[0.06] p-4 opacity-0 backdrop-blur-sm">
        <p className="font-utility text-[10px] font-medium uppercase tracking-[0.14em] text-paper/50">
          Weakest topic · this test
        </p>
        <p className="mt-1.5 font-display text-base text-paper/90">
          Geometry <span className="text-paper/40">/</span> Circles{" "}
          <span className="text-paper/40">/</span> Tangents
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-mark" />
          <span className="font-utility text-xl font-semibold text-paper">
            31%
          </span>
          <span className="font-utility text-[11px] uppercase tracking-wide text-paper/45">
            class accuracy
          </span>
        </div>
      </div>
    </div>
  );
}
