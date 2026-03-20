"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";

export function useRealtimeNotes() {
  const utils = trpc.useUtils();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-notes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notes",
        },
        () => {
          utils.notes.list.invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [utils]);
}
