import type { Metadata } from "next";

import AppProviders from "@/components/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "NOTESLITE",
  description: "Notes dashboard on Next.js + Prisma + PostgreSQL",
};

import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let themeClass = "theme-standard";
  
  try {
    const cookieStore = await cookies();
    const themeCookie = cookieStore.get("noteslite-theme");
    
    // Default to cookie theme if present
    if (themeCookie?.value) {
      themeClass = `theme-${themeCookie.value}`;
    }

    // Override with DB theme if user is logged in
    const user = await getCurrentUser();
    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      // The theme might be available if the generated client is up to date, otherwise use any cast
      const theme = (dbUser as any)?.theme;
      if (theme) {
        themeClass = `theme-${theme}`;
      }
    }
  } catch (err) {
    console.warn("Layout theme error (safe to ignore if Prisma client is regenerating):", err);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={themeClass} suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
