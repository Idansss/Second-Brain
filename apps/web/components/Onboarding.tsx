"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  PenLine,
  Sparkles,
  Search,
  PartyPopper,
  X,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "onboarding_v2";

// ── Step definitions ──────────────────────────────────────────────────────────

interface Step {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: { label: string; href: string };
  highlight?: "capture" | "ai" | "search" | "confetti";
}

const STEPS: Step[] = [
  {
    id: "welcome",
    icon: <Brain size={40} strokeWidth={1.5} />,
    title: "Welcome to Second Brain",
    description:
      "Your AI-powered personal knowledge base. Capture anything, find everything, and let AI connect the dots — so you never lose a thought again.",
    cta: { label: "Get started", href: "#next" },
  },
  {
    id: "capture",
    icon: <PenLine size={40} strokeWidth={1.5} />,
    title: "Capture your first thought",
    description:
      "Paste a URL, type a note, record a voice memo, or add a task. The Capture box is always one click away from wherever you are.",
    cta: { label: "Try capturing now", href: "/capture" },
    highlight: "capture",
  },
  {
    id: "ai",
    icon: <Sparkles size={40} strokeWidth={1.5} />,
    title: "AI organizes it for you",
    description:
      "Tags, entities, tasks, and key facts are extracted automatically. Your notes form a living knowledge graph — no filing required.",
    highlight: "ai",
  },
  {
    id: "search",
    icon: <Search size={40} strokeWidth={1.5} />,
    title: "Search your entire brain",
    description:
      'Semantic search understands meaning, not just keywords. Ask "what did I read about sleep last month?" and get cited answers from your own notes.',
    cta: { label: "Open search", href: "/search" },
    highlight: "search",
  },
  {
    id: "done",
    icon: <PartyPopper size={40} strokeWidth={1.5} />,
    title: "You're all set!",
    description:
      "Your Second Brain is ready. Start capturing and watch your knowledge base grow smarter every day.",
    cta: { label: "Start capturing", href: "/capture" },
    highlight: "confetti",
  },
];

// ── Confetti dots (CSS keyframe animation) ────────────────────────────────────

const CONFETTI_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899",
  "#14b8a6", "#f97316", "#a855f7", "#22c55e",
];

function ConfettiDot({
  color,
  style,
}: {
  color: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        animation: "confettiFall 2.2s ease-in forwards",
        ...style,
      }}
    />
  );
}

function Confetti() {
  const dots = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.8}s`,
    size: 6 + Math.floor(Math.random() * 6),
  }));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        borderRadius: "inherit",
      }}
    >
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(220px) rotate(540deg); opacity: 0; }
        }
      `}</style>
      {dots.map((d) => (
        <ConfettiDot
          key={d.id}
          color={d.color}
          style={{
            left: d.left,
            top: "-10px",
            width: d.size,
            height: d.size,
            animationDelay: d.delay,
          }}
        />
      ))}
    </div>
  );
}

// ── Pulsing highlight ring ─────────────────────────────────────────────────────

function PulseRing({ color }: { color: string }) {
  return (
    <>
      <style>{`
        @keyframes pulseRing {
          0%   { transform: scale(0.92); opacity: 0.7; }
          50%  { transform: scale(1.06); opacity: 0.3; }
          100% { transform: scale(0.92); opacity: 0.7; }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          inset: -8,
          borderRadius: 20,
          border: `2px solid ${color}`,
          animation: "pulseRing 1.8s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({
  total,
  current,
  onGoto,
}: {
  total: number;
  current: number;
  onGoto: (i: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onGoto(i)}
          aria-label={`Go to step ${i + 1}`}
          style={{
            width: i === current ? 20 : 7,
            height: 7,
            borderRadius: 4,
            background:
              i === current ? "var(--color-accent)" : "var(--color-border)",
            border: "none",
            cursor: "pointer",
            padding: 0,
            transition: "all 0.25s ease",
          }}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface OnboardingProps {
  hasNotes: boolean;
}

export function Onboarding({ hasNotes }: OnboardingProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  function advance() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  if (!visible || hasNotes) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <>
      {/* Full-screen backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 8000,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) dismiss();
        }}
      >
        {/* Card */}
        <div
          style={{
            position: "relative",
            width: "min(520px, 100%)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 20,
            padding: "40px 36px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            overflow: "visible",
          }}
        >
          {/* Confetti overlay on last step */}
          {current.highlight === "confetti" && <Confetti />}

          {/* Capture highlight ring */}
          {current.highlight === "capture" && (
            <PulseRing color="var(--color-accent)" />
          )}

          {/* Skip / close button */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Skip tour"
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            <X size={14} />
            Skip tour
          </button>

          {/* Step counter */}
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--color-accent)",
            }}
          >
            Step {step + 1} of {STEPS.length}
          </p>

          {/* Icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "rgba(99,102,241,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-accent)",
            }}
          >
            {current.icon}
          </div>

          {/* Text */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text)",
                lineHeight: 1.25,
              }}
            >
              {current.title}
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-muted)",
                lineHeight: 1.65,
              }}
            >
              {current.description}
            </p>
          </div>

          {/* Feature detail cards */}
          {current.highlight === "ai" && (
            <div
              style={{
                background: "var(--color-surface-2)",
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {[
                { emoji: "🏷️", label: "Auto-tagging" },
                { emoji: "🔗", label: "Entity extraction" },
                { emoji: "✅", label: "Task detection" },
              ].map(({ emoji, label }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    color: "var(--color-text)",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{emoji}</span>
                  {label}
                </div>
              ))}
            </div>
          )}

          {current.highlight === "search" && (
            <div
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Search size={14} color="var(--color-text-muted)" />
              <span
                style={{
                  fontSize: 13,
                  color: "var(--color-text-muted)",
                  fontStyle: "italic",
                }}
              >
                "what did I read about sleep last month?"
              </span>
            </div>
          )}

          {/* Navigation row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            {/* Progress dots */}
            <ProgressDots
              total={STEPS.length}
              current={step}
              onGoto={setStep}
            />

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!isFirst && (
                <button
                  type="button"
                  onClick={back}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "9px 14px",
                    borderRadius: 9,
                    border: "1px solid var(--color-border)",
                    background: "transparent",
                    color: "var(--color-text-muted)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <ChevronLeft size={14} />
                  Back
                </button>
              )}

              {current.cta && current.cta.href !== "#next" ? (
                <Link
                  href={current.cta.href}
                  onClick={isLast ? dismiss : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 18px",
                    borderRadius: 9,
                    background: "var(--color-accent)",
                    color: "white",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {current.cta.label}
                  {!isLast && <ArrowRight size={14} />}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={advance}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 18px",
                    borderRadius: 9,
                    border: "none",
                    background: "var(--color-accent)",
                    color: "white",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {isFirst ? "Get started" : isLast ? "Done" : "Next"}
                  {!isLast && <ArrowRight size={14} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
