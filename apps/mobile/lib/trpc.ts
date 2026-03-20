import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

// ── AppRouter type import ─────────────────────────────────────────────────────
// The mobile app references the web server's router type for end-to-end type
// safety. The actual API call goes over HTTP so no server code is bundled.
//
// For local development:   http://localhost:3000
// For production:          change API_URL to your deployed URL
// For physical device:     use your machine's LAN IP, e.g. http://192.168.1.x:3000

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// Typed tRPC client — import AppRouter from the web package if the monorepo
// exposes it, or use `any` as a fallback for standalone builds.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<any>();

export function buildTrpcClient(sessionToken?: string | null) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        transformer: superjson,
        headers() {
          if (sessionToken) {
            return { Authorization: `Bearer ${sessionToken}` };
          }
          return {};
        },
      }),
    ],
  });
}
