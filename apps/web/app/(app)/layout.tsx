"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <TopBar
        onToggleSidebar={() => isMobile ? setMobileOpen(v => !v) : setCollapsed(v => !v)}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Mobile backdrop */}
        {isMobile && mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
              zIndex: 200, backdropFilter: "blur(2px)",
            }}
          />
        )}
        <Sidebar
          collapsed={isMobile ? false : collapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          isMobile={isMobile}
        />
        <main style={{
          flex: 1,
          padding: isMobile ? "20px 16px" : "32px 40px",
          paddingBottom: isMobile ? "84px" : undefined,
          overflowY: "auto",
          minWidth: 0,
          boxSizing: "border-box",
          height: "100%",
        }}>
          {children}
        </main>
      </div>
      {isMobile && <BottomNav />}
      <CommandPalette />
      <KeyboardShortcutsModal />
    </div>
  );
}
