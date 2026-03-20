"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useTheme } from "@/app/providers";

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
  const brandLogoSrc = isDark ? "/logo-dark.png?v=1" : "/logo.png?v=4";

  async function handleLogin() {
    if (!email.trim()) return;
    setLoading(true);
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/capture` },
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-background)",
      }}
    >
      <div
        style={{
          width: 360,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={brandLogoSrc} alt="Second Brain logo" style={{ width: 56, height: 36, objectFit: "contain" }} />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Second Brain</h1>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
            <p style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text)", marginBottom: 8 }}>
              Check your email
            </p>
            <p>We sent a magic link to <strong>{email}</strong></p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="you@example.com"
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading || !email.trim()}
              style={{
                padding: "10px",
                borderRadius: 8,
                border: "none",
                background: "var(--color-accent)",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Sending..." : "Continue with email"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
