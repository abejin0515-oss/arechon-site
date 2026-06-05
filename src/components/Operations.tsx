"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { agents } from "@/data/agents";

/**
 * Operations — Arechon's signature section.
 *
 * What it shows: the actual 3-agent organization that built this site.
 * art-director / interaction-engineer / quality-auditor — three orbiting
 * nodes around a central ARECHON wordmark, connected by lines that pulse
 * as you scroll. Each agent's role description, deliverables, and color
 * fade in when its slot is in scrub focus.
 *
 * Pattern: 100vh-tall section pinned via ScrollTrigger, scrubbed across
 * three keyframes (one per agent). Pure SVG + CSS transform — no WebGL,
 * no extra bundle cost.
 *
 * Why this is the signature: no peer studio has a public, verifiable AI
 * organization with the actual agent definitions visible. The medium is
 * the proof — the system that built this section IS the section.
 *
 * Reduced motion: pin disabled, all three agents visible at once, static.
 * Mobile (< 768px): static stack with all three agents shown.
 */

const MOBILE_BREAKPOINT_PX = 768;

function nodePosition(i: number, n: number, radius: number) {
  // Equilateral triangle starting at top.
  const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

export function Operations() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [focus, setFocus] = useState(0); // 0..agents.length-1
  const [useFallback, setUseFallback] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const mobile = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`,
    ).matches;
    setUseFallback(reduced || mobile);
  }, []);

  useEffect(() => {
    if (useFallback) return;
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${section.offsetHeight * (agents.length - 1)}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const idx = Math.min(
            agents.length - 1,
            Math.floor(self.progress * agents.length),
          );
          setFocus(idx);
        },
      });
      return () => st.kill();
    }, section);

    return () => ctx.revert();
  }, [useFallback]);

  if (useFallback) {
    return (
      <section
        id="operations"
        aria-label="Operations — Claude Code agent organization"
        className="bg-[var(--bg)] py-[var(--space-24)] sm:py-[var(--space-32)]"
      >
        <div className="container-editorial">
          <p className="font-mono-accent text-[var(--muted)] mb-6">
            — Operations
          </p>
          <h2 className="font-display type-h1 max-w-[22ch] mb-12">
            このサイトを建てた、三体制。
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-x-[var(--space-8)] gap-y-[var(--space-12)]">
            {agents.map((a, i) => (
              <li
                key={a.slug}
                className="border-t-2 pt-6"
                style={{ borderColor: `oklch(0.62 0.18 ${a.hue})` }}
              >
                <p className="font-mono-accent text-[var(--muted)] mb-2">
                  0{i + 1} / {a.label}
                </p>
                <p className="type-body text-[var(--fg)]/90 mb-4">
                  {a.description}
                </p>
                <ul className="space-y-1">
                  {a.deliverables.map((d) => (
                    <li
                      key={d}
                      className="font-mono-accent text-[var(--muted)] flex gap-2"
                    >
                      <span
                        aria-hidden
                        style={{ color: `oklch(0.62 0.22 ${a.hue})` }}
                      >
                        ↳
                      </span>
                      <span lang="en">{d}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  const radius = 240;
  const positions = agents.map((_, i) => nodePosition(i, agents.length, radius));
  const focusAgent = agents[focus];

  return (
    <section
      ref={sectionRef}
      id="operations"
      aria-label="Operations — Claude Code agent organization"
      className="relative bg-[var(--bg)] overflow-hidden"
      style={{ height: "100vh" }}
    >
      <div
        ref={stageRef}
        className="absolute inset-0 flex flex-col"
      >
        {/* Header */}
        <div className="container-editorial pt-24 pb-8 grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)]">
          <div className="col-span-3">
            <p className="font-mono-accent text-[var(--muted)]">— Operations</p>
          </div>
          <div className="col-span-9">
            <p className="font-mono-accent text-[var(--muted)]">
              CLAUDE CODE / 3-AGENT ORGANIZATION
            </p>
          </div>
        </div>

        {/* Stage */}
        <div className="relative flex-1 container-editorial grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)]">
          {/* SVG constellation, left 7 cols */}
          <div className="col-span-7 relative">
            <svg
              viewBox="-300 -300 600 600"
              className="absolute inset-0 w-full h-full"
              aria-hidden="true"
            >
              {/* Connection lines */}
              {positions.map((p, i) => {
                const active = i === focus;
                return (
                  <line
                    key={`line-${i}`}
                    x1={0}
                    y1={0}
                    x2={p.x}
                    y2={p.y}
                    stroke={
                      active
                        ? `oklch(0.65 0.22 ${agents[i].hue})`
                        : `oklch(0.45 0.02 260)`
                    }
                    strokeWidth={active ? 2 : 0.8}
                    strokeDasharray={active ? "0" : "3 6"}
                    style={{
                      transition:
                        "stroke 600ms var(--ease-out-expo), stroke-width 600ms var(--ease-out-expo)",
                    }}
                  />
                );
              })}

              {/* Center label */}
              <text
                x={0}
                y={8}
                textAnchor="middle"
                fill="var(--fg)"
                style={{
                  fontFamily: "var(--font-display-stack)",
                  fontSize: "40px",
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                }}
              >
                ARECHON
              </text>
              <text
                x={0}
                y={32}
                textAnchor="middle"
                fill="var(--muted)"
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                }}
              >
                ORCHESTRATOR
              </text>

              {/* Agent nodes */}
              {positions.map((p, i) => {
                const a = agents[i];
                const active = i === focus;
                const r = active ? 56 : 40;
                return (
                  <g
                    key={a.slug}
                    style={{
                      transition: "transform 600ms var(--ease-out-expo)",
                    }}
                  >
                    {/* Halo */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={r + 28}
                      fill={`oklch(0.62 0.22 ${a.hue})`}
                      opacity={active ? 0.18 : 0}
                      style={{
                        transition: "opacity 600ms var(--ease-out-expo)",
                      }}
                    />
                    {/* Body */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={r}
                      fill="var(--bg)"
                      stroke={`oklch(0.6 0.2 ${a.hue})`}
                      strokeWidth={active ? 2.5 : 1.5}
                      style={{
                        transition:
                          "r 600ms var(--ease-out-expo), stroke-width 600ms var(--ease-out-expo)",
                      }}
                    />
                    <text
                      x={p.x}
                      y={p.y - 4}
                      textAnchor="middle"
                      fill="var(--fg)"
                      style={{
                        fontFamily: "var(--font-mono-stack)",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      0{i + 1}
                    </text>
                    <text
                      x={p.x}
                      y={p.y + 12}
                      textAnchor="middle"
                      fill="var(--fg)"
                      style={{
                        fontFamily: "var(--font-display-stack)",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {a.label.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Description panel, right 5 cols */}
          <div className="col-span-5 self-center" key={focusAgent.slug}>
            <p
              className="font-mono-accent mb-4 transition-colors duration-[var(--dur-standard)]"
              style={{ color: `oklch(0.6 0.22 ${focusAgent.hue})` }}
            >
              0{focus + 1} /{" "}
              <span lang="en">{focusAgent.label}</span>
            </p>
            <h3 className="font-display type-h2 mb-4">
              {focusAgent.role}
            </h3>
            <p className="type-body text-[var(--fg)]/90 mb-8 max-w-[40ch]">
              {focusAgent.description}
            </p>
            <ul className="space-y-2">
              {focusAgent.deliverables.map((d) => (
                <li
                  key={d}
                  className="font-mono-accent text-[var(--muted)] flex items-baseline gap-3"
                >
                  <span
                    aria-hidden
                    style={{ color: `oklch(0.6 0.22 ${focusAgent.hue})` }}
                  >
                    ↳
                  </span>
                  <span lang="en">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer progress */}
        <div className="container-editorial pb-8 grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)] items-end">
          <div className="col-span-7 flex gap-2">
            {agents.map((_, i) => (
              <div
                key={i}
                className="h-px flex-1"
                style={{
                  background:
                    i <= focus
                      ? `oklch(0.6 0.22 ${agents[i].hue})`
                      : "var(--border)",
                  transition: "background 400ms var(--ease-out-expo)",
                }}
              />
            ))}
          </div>
          <div className="col-span-5 font-mono-accent text-[var(--muted)] text-right">
            0{focus + 1} / 0{agents.length}
          </div>
        </div>
      </div>
    </section>
  );
}
