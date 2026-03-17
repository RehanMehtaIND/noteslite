"use client";

import { ClerkProvider } from "@clerk/nextjs";

export default function AppProviders({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
