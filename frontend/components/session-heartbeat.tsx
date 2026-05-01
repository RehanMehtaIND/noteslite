"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function SessionHeartbeat() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    function sendHeartbeat() {
      fetch("/api/auth/session/heartbeat", { method: "POST" }).catch(() => {});
    }

    // Send heartbeat immediately on mount
    sendHeartbeat();

    // And then every 1 minute
    const intervalId = setInterval(sendHeartbeat, 60 * 1000);

    // Also send on window focus or visibility change to catch devices coming out of sleep/background
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    }

    window.addEventListener("focus", sendHeartbeat);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", sendHeartbeat);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [status]);

  return null;
}
