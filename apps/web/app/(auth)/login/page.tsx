"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useTheme } from "@/app/providers";
import { Brain, Sparkles, CheckCircle2, ArrowRight, Loader2, Mail } from "lucide-react";

const FEATURES = [
  "Capture notes, ideas & links instantly",
  "AI-powered search & smart summaries",
  "Auto-extract tasks from your notes",
  "Knowledge graph & entity connections",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const brandLogoSrc = isDark ? "/logo-dark.png?v=2" : "/logo.png?v=4";

  async function handleLogin() {
    if (!email.trim()) return;
    setLoading(true);
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/home` },
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "var(--color-background)",
      fontFamily: "inherit",
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 80px",
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: "absolute", top: -80, right: -80,
          width: 320, height: 320, borderRadius: "50%",
          background: "rgba(99,102,241,0.25)", filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", bottom: -60, left: -60,
          width: 260, height: 260, borderRadius: "50%",
          background: "rgba(167,139,250,0.2)", filter: "blur(50px)",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <img src={brandLogoSrc} alt="Second Brain" style={{ width: 48, height: 32, objectFit: "contain" }} />
            <span style={{ fontSize: 22, fontWeight: 700, color: "white" }}>Second Brain</span>
          </div>

          <h2 style={{
            fontSize: 42, fontWeight: 800, color: "white",
            lineHeight: 1.15, marginBottom: 16, letterSpacing: "-0.02em",
          }}>
            Your mind,<br />
            <span style={{ color: "#a5b4fc" }}>amplified by AI.</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 48, maxWidth: 380 }}>
            The all-in-one workspace that captures what you think, connects what you know, and surfaces what matters.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "rgba(165,180,252,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <CheckCircle2 size={13} color="#a5b4fc" />
                </div>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Floating stat badges */}
          <div style={{ display: "flex", gap: 12, marginTop: 52 }}>
            {[
              { icon: <Brain size={14} color="#a5b4fc" />, label: "AI-powered" },
              { icon: <Sparkles size={14} color="#a5b4fc" />, label: "Smart digest" },
            ].map(({ icon, label }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 20, padding: "6px 14px",
              }}>
                {icon}
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: 480,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 48px",
        background: "var(--color-surface)",
      }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(99,102,241,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
              }}>
                <Mail size={28} color="var(--color-accent)" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Check your inbox</h2>
              <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.7, marginBottom: 8 }}>
                We sent a magic link to
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-accent)", marginBottom: 24 }}>{email}</p>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                Click the link in the email to sign in. No password needed.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                style={{
                  marginTop: 28, background: "none", border: "1px solid var(--color-border)",
                  borderRadius: 8, padding: "9px 20px", fontSize: 13,
                  color: "var(--color-text-muted)", cursor: "pointer",
                }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 36 }}>
                <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.01em" }}>
                  Welcome back
                </h2>
                <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                  Sign in with a magic link — no password required.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)" }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="you@example.com"
                  autoFocus
                  style={{
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1.5px solid var(--color-border)",
                    background: "var(--color-background)",
                    color: "var(--color-text)",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "inherit",
                    transition: "border-color 0.15s",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loading || !email.trim()}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: loading || !email.trim()
                    ? "var(--color-surface-2)"
                    : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  color: loading || !email.trim() ? "var(--color-text-muted)" : "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading || !email.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "opacity 0.15s, transform 0.1s",
                  boxShadow: loading || !email.trim() ? "none" : "0 4px 14px rgba(79,70,229,0.4)",
                }}
                onMouseEnter={(e) => {
                  if (!loading && email.trim()) (e.currentTarget as HTMLElement).style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
              >
                {loading
                  ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Sending link...</>
                  : <><ArrowRight size={15} /> Continue with email</>}
              </button>

              <p style={{ marginTop: 24, fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.6 }}>
                By continuing, you agree to our terms of service. We&apos;ll email you a magic link for passwordless sign-in.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
