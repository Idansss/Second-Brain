"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, useEffect, createContext, useContext } from "react";
import superjson from "superjson";
import { trpc } from "@/lib/trpc/client";

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "system",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyThemeToDOM(t: Theme) {
  const root = document.documentElement;
  if (t === "system") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", dark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", t);
  }
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [localTheme, setLocalTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) ?? "system";
    }
    return "system";
  });

  const { data: profile } = trpc.settings.get.useQuery(undefined, { retry: false });

  // Sync DB value only on first load (when localStorage has no preference yet)
  useEffect(() => {
    const dbTheme = (profile?.settings as { theme?: Theme } | null)?.theme;
    if (dbTheme && !localStorage.getItem("theme")) {
      setLocalTheme(dbTheme);
      localStorage.setItem("theme", dbTheme);
    }
  }, [profile]);

  // Apply to DOM whenever localTheme changes
  useEffect(() => {
    applyThemeToDOM(localTheme);

    if (localTheme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [localTheme]);

  function setTheme(t: Theme) {
    setLocalTheme(t);
    localStorage.setItem("theme", t);
    applyThemeToDOM(t);
  }

  return (
    <ThemeContext.Provider value={{ theme: localTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Root providers
// ---------------------------------------------------------------------------

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
