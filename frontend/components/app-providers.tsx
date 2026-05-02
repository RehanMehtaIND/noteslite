"use client";

import { SessionProvider } from "next-auth/react";
import { SessionHeartbeat } from "@/frontend/components/session-heartbeat";

export default function AppProviders({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <SessionHeartbeat />
      {children}
    </SessionProvider>
  );
}
