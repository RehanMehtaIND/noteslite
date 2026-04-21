import type { Metadata } from "next";

import AppProviders from "@/components/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "NOTESLITE",
  description: "Notes dashboard on Next.js + Prisma + PostgreSQL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
