"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function SessionHeartbeat() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    // Send heartbeat immediately on mount
    fetch("/api/auth/session/heartbeat", { method: "POST" }).catch(() => {});

    // And then every 1 minute
    const intervalId = setInterval(() => {
      fetch("/api/auth/session/heartbeat", { method: "POST" }).catch(() => {});
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [status]);

  return null;
}
