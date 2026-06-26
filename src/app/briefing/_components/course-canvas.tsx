"use client";

import * as React from "react";

import type { Conditions, CourseLayout, Point } from "@/lib/briefing/types";

type HandleKey = keyof CourseLayout;

const HANDLE_KEYS: HandleKey[] = [
  "windward",
  "committee",
  "pin",
  "leewardLeft",
  "leewardRight",
  "currentFrom",
  "currentTo",
];

const VB_W = 100;
const VB_H = 140;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function CourseCanvas({
  course,
  conditions,
  onChange,
  readOnly = false,
}: {
  course: CourseLayout;
  conditions: Conditions;
  onChange?: (next: CourseLayout) => void;
  readOnly?: boolean;
}) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [active, setActive] = React.useState<HandleKey | null>(null);

  const toSvg = React.useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return {
      x: clamp(((clientX - r.left) / r.width) * VB_W, 3, 97),
      y: clamp(((clientY - r.top) / r.height) * VB_H, 3, 137),
    };
  }, []);

  const onPointerMove = (e: React.PointerEvent) => {
    if (!active || readOnly || !onChange) return;
    const p = toSvg(e.clientX, e.clientY);
    onChange({ ...course, [active]: p });
  };

  const startDrag = (key: HandleKey) => (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setActive(key);
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (active) {
      svgRef.current?.releasePointerCapture?.(e.pointerId);
      setActive(null);
    }
  };

  const startMid = mid(course.committee, course.pin);
  const leeMid = mid(course.leewardLeft, course.leewardRight);

  // Laylines from the windward mark down to the bottom at ~45°.
  const reach = VB_H - course.windward.y;
  const layLeft = { x: course.windward.x - reach, y: VB_H };
  const layRight = { x: course.windward.x + reach, y: VB_H };

  return (
    <div className="w-full">
      <div
        className="relative mx-auto w-full overflow-hidden rounded-xl border bg-[#eaf3f7]"
        style={{ aspectRatio: `${VB_W} / ${VB_H}`, maxWidth: 460 }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="absolute inset-0 h-full w-full touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          <defs>
            <marker
              id="wind-head"
              markerWidth="6"
              markerHeight="6"
              refX="3"
              refY="5"
              orient="auto"
            >
              <path d="M0,0 L3,5 L6,0 Z" fill="#1e3a5f" />
            </marker>
            <marker
              id="current-head"
              markerWidth="6"
              markerHeight="6"
              refX="3"
              refY="5"
              orient="auto"
            >
              <path d="M0,0 L3,5 L6,0 Z" fill="#0d9488" />
            </marker>
          </defs>

          {/* Laylines */}
          <line
            x1={course.windward.x}
            y1={course.windward.y}
            x2={layLeft.x}
            y2={layLeft.y}
            stroke="#9bb7c4"
            strokeWidth={0.5}
            strokeDasharray="2 2"
          />
          <line
            x1={course.windward.x}
            y1={course.windward.y}
            x2={layRight.x}
            y2={layRight.y}
            stroke="#9bb7c4"
            strokeWidth={0.5}
            strokeDasharray="2 2"
          />

          {/* Rhumb line: start → windward → leeward */}
          <polyline
            points={`${startMid.x},${startMid.y} ${course.windward.x},${course.windward.y} ${leeMid.x},${leeMid.y}`}
            fill="none"
            stroke="#7fa0b0"
            strokeWidth={0.6}
            strokeDasharray="3 2"
          />

          {/* Wind arrow (blows top → bottom) */}
          <line
            x1={course.windward.x}
            y1={6}
            x2={course.windward.x}
            y2={20}
            stroke="#1e3a5f"
            strokeWidth={1.4}
            markerEnd="url(#wind-head)"
          />
          <text
            x={course.windward.x + 4}
            y={12}
            fontSize={4.6}
            fill="#1e3a5f"
            fontWeight={600}
          >
            Wind {Math.round(conditions.windDirDeg)}° · {conditions.windKnMin}–
            {conditions.windKnMax} kn
          </text>

          {/* Current arrow */}
          <line
            x1={course.currentFrom.x}
            y1={course.currentFrom.y}
            x2={course.currentTo.x}
            y2={course.currentTo.y}
            stroke="#0d9488"
            strokeWidth={1.6}
            markerEnd="url(#current-head)"
          />
          <text
            x={course.currentTo.x + 3}
            y={(course.currentFrom.y + course.currentTo.y) / 2}
            fontSize={4.4}
            fill="#0d9488"
            fontWeight={600}
          >
            Strom {conditions.currentKn} kn
          </text>

          {/* Windward mark */}
          <circle
            cx={course.windward.x}
            cy={course.windward.y}
            r={2.6}
            fill="#f59e0b"
            stroke="#b45309"
            strokeWidth={0.6}
          />
          <text
            x={course.windward.x}
            y={course.windward.y - 4}
            fontSize={4.4}
            fill="#92400e"
            fontWeight={700}
            textAnchor="middle"
          >
            Luv
          </text>

          {/* Leeward gate */}
          {[course.leewardLeft, course.leewardRight].map((m, i) => (
            <circle
              key={i}
              cx={m.x}
              cy={m.y}
              r={2.2}
              fill="#f59e0b"
              stroke="#b45309"
              strokeWidth={0.5}
            />
          ))}
          <text
            x={leeMid.x}
            y={leeMid.y + 7}
            fontSize={4.4}
            fill="#92400e"
            fontWeight={700}
            textAnchor="middle"
          >
            Lee-Tor
          </text>

          {/* Start line */}
          <line
            x1={course.committee.x}
            y1={course.committee.y}
            x2={course.pin.x}
            y2={course.pin.y}
            stroke="#1e3a5f"
            strokeWidth={0.9}
            strokeDasharray="2 1.5"
          />
          {/* Committee boat */}
          <rect
            x={course.committee.x - 2.6}
            y={course.committee.y - 1.8}
            width={5.2}
            height={3.6}
            rx={1}
            fill="#1e3a5f"
          />
          <text
            x={course.committee.x}
            y={course.committee.y + 7}
            fontSize={4}
            fill="#1e3a5f"
            fontWeight={600}
            textAnchor="middle"
          >
            Komitee
          </text>
          {/* Pin */}
          <circle
            cx={course.pin.x}
            cy={course.pin.y}
            r={2.2}
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth={0.5}
          />
          <text
            x={course.pin.x}
            y={course.pin.y + 7}
            fontSize={4}
            fill="#7f1d1d"
            fontWeight={600}
            textAnchor="middle"
          >
            Pin
          </text>

          {/* Drag handles */}
          {!readOnly &&
            HANDLE_KEYS.map((key) => {
              const p = course[key];
              return (
                <circle
                  key={key}
                  cx={p.x}
                  cy={p.y}
                  r={5.5}
                  fill="transparent"
                  stroke={active === key ? "#1e3a5f" : "transparent"}
                  strokeWidth={0.8}
                  className="cursor-grab active:cursor-grabbing"
                  style={{ touchAction: "none" }}
                  onPointerDown={startDrag(key)}
                />
              );
            })}
        </svg>
      </div>
      {!readOnly ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Tonnen, Startlinie und Strompfeil zum Verschieben ziehen. Oben = Luv,
          der Wind weht nach unten.
        </p>
      ) : null}
    </div>
  );
}
