"use client";

import { useRouter } from "next/navigation";
import { Moon, Search, Settings, Sun } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useTheme } from "@/app/providers";
import { trpc } from "@/lib/trpc/client";
import { useIsMobile } from "@/hooks/useIsMobile";

export function TopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const router = useRouter();
  const { data: profile } = trpc.settings.get.useQuery();
  const isMobile = useIsMobile();

  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const initial = profile?.displayName?.[0]?.toUpperCase()
    ?? profile?.email?.[0]?.toUpperCase()
    ?? "?";

  const isSignedStorageUrl = !!profile?.avatarUrl
    && (profile.avatarUrl.includes("/object/sign/") || profile.avatarUrl.includes("token="));

  const avatarSrc = profile?.avatarUrl
    ? isSignedStorageUrl
      ? profile.avatarUrl
      : `${profile.avatarUrl}${profile.avatarUrl.includes("?") ? "&" : "?"}v=${new Date(profile.updatedAt).getTime()}`
    : "";

  const brandLogoSrc = isDark ? "/logo-dark.png?v=1" : "/logo.png?v=4";

  return (
    <header style={{
      height: 70,
      background: "var(--color-surface)",
      borderBottom: "1px solid var(--color-border)",
      display: "flex",
      alignItems: "center",
      padding: "0 16px",
      gap: isMobile ? 8 : 12,
      flexShrink: 0,
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Hamburger + Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexShrink: 0 }}>
        <button
          type="button"
          title="Toggle sidebar"
          onClick={onToggleSidebar}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 6, borderRadius: 8, display: "flex", alignItems: "center" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => router.push("/capture")}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8 }}
        >
          <img src={brandLogoSrc} alt="Second Brain logo" style={{ width: 48, height: 32, objectFit: "contain" }} />
          {!isMobile && (
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                background: "linear-gradient(90deg, #18b8ff 0%, #2f7dff 45%, #7a4dff 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                textShadow: "0 0 14px rgba(79, 126, 255, 0.18)",
              }}
            >
              Second Brain
            </span>
          )}
        </button>
      </div>

      {/* Search bar — hidden on mobile, shown on desktop */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("openCommandPalette"))}
          style={{
            flex: 1,
            maxWidth: 600,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 16px",
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: 24,
            cursor: "pointer",
            color: "var(--color-text-muted)",
            fontSize: 14,
            textAlign: "left",
          }}
        >
          <Search size={15} />
          <span style={{ flex: 1 }}>Search or run a command…</span>
          <kbd style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: "var(--color-surface)", border: "1px solid var(--color-border)", fontFamily: "monospace" }}>⌘K</kbd>
        </button>
      )}

      {/* Right actions */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: isMobile ? 2 : 6 }}>
        {/* Search icon button — mobile only */}
        {isMobile && (
          <button
            type="button"
            title="Search"
            onClick={() => window.dispatchEvent(new Event("openCommandPalette"))}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 7, borderRadius: 8, display: "flex", alignItems: "center" }}
          >
            <Search size={17} />
          </button>
        )}
        <NotificationCenter />
        <button
          type="button"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 7, borderRadius: 8, display: "flex", alignItems: "center" }}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        {/* Settings gear — hidden on mobile (accessible via sidebar) */}
        {!isMobile && (
          <button
            type="button"
            title="Settings"
            onClick={() => router.push("/settings")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 7, borderRadius: 8, display: "flex", alignItems: "center" }}
          >
            <Settings size={17} />
          </button>
        )}
        {/* Avatar */}
        <button
          type="button"
          title="View profile"
          onClick={() => router.push("/profile")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 4, borderRadius: "50%", display: "flex" }}
        >
          {profile?.avatarUrl ? (
            <img
              src={avatarSrc}
              alt={initial}
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--color-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "white",
            }}>
              {initial}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
