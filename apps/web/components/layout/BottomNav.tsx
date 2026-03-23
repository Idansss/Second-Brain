"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BookOpen, PenLine, CheckSquare, Search } from "lucide-react";

const NAV = [
  { href: "/home",    icon: Home,        label: "Home" },
  { href: "/notes",   icon: BookOpen,    label: "Notes" },
  { href: "/capture", icon: PenLine,     label: "Capture", isCta: true },
  { href: "/tasks",   icon: CheckSquare, label: "Tasks" },
  { href: "/search",  icon: Search,      label: "Search" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: "var(--color-surface)",
      borderTop: "1px solid var(--color-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      zIndex: 400,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {NAV.map(({ href, icon: Icon, label, isCta }) => {
        const active = href === "/home" || href === "/tasks"
          ? pathname === href
          : pathname.startsWith(href);

        if (isCta) {
          return (
            <button
              key={href}
              type="button"
              onClick={() => router.push(href)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--color-accent)",
                border: "none",
                cursor: "pointer",
                color: "white",
                marginBottom: 8,
                boxShadow: "0 4px 14px rgba(99,102,241,0.45)",
              }}
            >
              <Icon size={22} />
            </button>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "6px 12px",
              textDecoration: "none",
              color: active ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              minWidth: 48,
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
