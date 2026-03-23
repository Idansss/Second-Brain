"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, BookOpen, MessageSquare, CheckSquare, Sparkles, ArrowRight } from "lucide-react";

const STEPS = [
  {
    emoji: "🧠",
    title: "Welcome to Second Brain",
    description: "Your personal AI knowledge base. Capture anything — notes, links, voice memos, ideas — and let AI help you connect the dots.",
    cta: "Get started",
  },
  {
    icon: BookOpen,
    emoji: "📝",
    title: "Capture your thoughts",
    description: "Use the Capture button to save notes, paste links, or speak your ideas. Everything is automatically tagged and searchable.",
    cta: "Next",
  },
  {
    emoji: "✅",
    title: "Tasks are automatic",
    description: "When you capture notes with action items, AI extracts them into your task list. No manual entry needed.",
    cta: "Next",
  },
  {
    emoji: "💬",
    title: "Chat with your brain",
    description: "Ask questions like \"What have I been thinking about lately?\" or \"Summarize my notes on X\" and get instant answers.",
    cta: "Next",
  },
  {
    emoji: "✨",
    title: "You're all set!",
    description: "Start by capturing your first note. The more you add, the smarter your Second Brain becomes.",
    cta: "Start capturing",
    ctaHref: "/capture",
  },
];

const STORAGE_KEY = "onboarding_complete";

export function OnboardingModal() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {}
  }, []);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
      router.push(STEPS[step]?.ctaHref ?? "/capture");
    }
  }

  if (!visible) return null;

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 20,
        padding: 36,
        maxWidth: 420,
        width: "100%",
        position: "relative",
        boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
      }}>
        {/* Close */}
        <button
          type="button"
          onClick={dismiss}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-muted)", padding: 4, borderRadius: 6,
            display: "flex", alignItems: "center",
          }}
        >
          <X size={16} />
        </button>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 3, flex: 1, borderRadius: 2,
              background: i <= step ? "var(--color-accent)" : "var(--color-border)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>{current.emoji}</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.01em" }}>
            {current.title}
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.7, marginBottom: 28 }}>
            {current.description}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={next}
            style={{
              width: "100%", padding: "12px",
              borderRadius: 12, border: "none",
              background: "var(--color-accent)", color: "white",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
            }}
          >
            {current.cta}
            {isLast && <ArrowRight size={16} />}
          </button>
          {!isLast && (
            <button
              type="button"
              onClick={dismiss}
              style={{
                width: "100%", padding: "10px",
                borderRadius: 12, border: "none",
                background: "transparent", color: "var(--color-text-muted)",
                fontSize: 13, cursor: "pointer",
              }}
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
