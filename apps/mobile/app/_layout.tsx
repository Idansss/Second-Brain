import React, { useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, buildTrpcClient } from "@/lib/trpc";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 1000 * 30, // 30s
      },
    },
  }));

  const [trpcClient] = useState(() => buildTrpcClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="light" backgroundColor={colors.background} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "fade",
            }}
          />
        </SafeAreaProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
