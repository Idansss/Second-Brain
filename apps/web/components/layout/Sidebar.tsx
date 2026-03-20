"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PenLine, Search, CheckSquare, BookOpen, Network, Sparkles,
  FolderOpen, Lightbulb, GitFork, Users, Import, BarChart2, Activity, CalendarDays,
  MessageSquare, Brain, Home, X,
} from "lucide-react";

const nav = [
  { href: "/home",           icon: Home,          label: "Home" },
  { href: "/notes",          icon: BookOpen,      label: "Notes" },
  { href: "/search",         icon: Search,        label: "Search" },
  { href: "/chat",           icon: MessageSquare, label: "Chat" },
  { href: "/tasks",          icon: CheckSquare,   label: "Tasks" },
  { href: "/tasks/calendar", icon: CalendarDays,  label: "Calendar" },
  { href: "/collections",    icon: FolderOpen,    label: "Collections" },
  { href: "/entities",       icon: Network,       label: "Knowledge" },
  { href: "/graph",          icon: GitFork,       label: "Graph" },
  { href: "/digest",         icon: Sparkles,      label: "Digest" },
  { href: "/intelligence",   icon: Lightbulb,     label: "Intelligence" },
  { href: "/meeting",        icon: CalendarDays,  label: "Meeting" },
  { href: "/review",         icon: Brain,         label: "Review" },
  { href: "/analytics",      icon: BarChart2,     label: "Analytics" },
  { href: "/activity",       icon: Activity,      label: "Activity" },
  { href: "/shared-brain",   icon: Users,         label: "Shared" },
  { href: "/import",         icon: Import,        label: "Import" },
];

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const width = collapsed ? 64 : 240;

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: 260,
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        gap: 2,
        flexShrink: 0,
        zIndex: 300,
        transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        overflowY: "auto",
        overflowX: "hidden",
      }
    : {
        width,
        minHeight: "100%",
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        padding: collapsed ? "12px 8px" : "12px",
        gap: 2,
        flexShrink: 0,
        transition: "width 0.2s ease",
        overflow: "hidden",
      };

  function handleNavClick() {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  }

  return (
    <aside style={sidebarStyle}>
      {/* Mobile close button */}
      {isMobile && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <button
            type="button"
            onClick={onMobileClose}
            title="Close menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Capture button — like Gmail's Compose */}
      <button
        type="button"
        onClick={() => { router.push("/capture"); handleNavClick(); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: (!isMobile && collapsed) ? 0 : 10,
          justifyContent: (!isMobile && collapsed) ? "center" : "flex-start",
          padding: (!isMobile && collapsed) ? "10px" : "10px 16px",
          marginBottom: 8,
          borderRadius: 20,
          border: "none",
          background: "var(--color-surface-2)",
          color: "var(--color-text)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          width: "100%",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)")}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)")}
      >
        <PenLine size={16} color="var(--color-accent)" style={{ flexShrink: 0 }} />
        {(isMobile || !collapsed) && "New Capture"}
      </button>

      {/* Nav items */}
      {nav.map(({ href, icon: Icon, label }) => {
        // Use exact match for /tasks so /tasks/calendar doesn't also highlight it
        const active = href === "/home" || href === "/tasks" ? pathname === href : pathname.startsWith(href);
        const isCollapsed = !isMobile && collapsed;
        return (
          <Link
            key={href}
            href={href}
            title={isCollapsed ? label : undefined}
            onClick={handleNavClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: isCollapsed ? 0 : 12,
              justifyContent: isCollapsed ? "center" : "flex-start",
              padding: isCollapsed ? "10px" : "9px 14px",
              borderRadius: 20,
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              color: active ? "var(--color-text)" : "var(--color-text-muted)",
              background: active ? "var(--color-surface-2)" : "transparent",
              textDecoration: "none",
              transition: "background 0.15s",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>{label}</span>}
          </Link>
        );
      })}
    </aside>
  );
}
