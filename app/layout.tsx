import type { Metadata } from "next";

import AppProviders from "@/components/app-providers";

import "./globals.css";

function hasValidClerkKey(value: string | undefined, prefix: "pk_" | "sk_") {
  if (!value) {
    return false;
  }

  return value.startsWith(prefix) && /^[\x00-\x7F]+$/.test(value);
}

export const metadata: Metadata = {
  title: "NOTESLITE",
  description: "Notes dashboard on Next.js + Prisma + PostgreSQL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasInvalidClerkConfig =
    !hasValidClerkKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, "pk_") ||
    !hasValidClerkKey(process.env.CLERK_SECRET_KEY, "sk_");

  if (process.env.NODE_ENV !== "production" && hasInvalidClerkConfig) {
    return (
      <html lang="en">
        <body className="min-h-screen bg-[#e3dbd3] px-6 py-12 text-[#4a4440]">
          <main className="mx-auto max-w-2xl rounded-[32px] bg-[#f3f1e9] p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
            <h1 className="text-3xl font-semibold tracking-[0.12em] text-[#6b6661]">
              Clerk config is invalid
            </h1>
            <p className="mt-4 text-base leading-7">
              Authentication is rendering blank because the Clerk environment variables are not valid.
            </p>
            <p className="mt-4 text-base leading-7">
              Update the root .env file with your real Clerk keys. The current CLERK_SECRET_KEY appears to be a masked placeholder instead of an actual sk_test_ or sk_live_ value.
            </p>
            <div className="mt-6 rounded-2xl bg-[#e6d9d4] p-5 text-sm leading-7 text-[#5c5550]">
              <div>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...</div>
              <div>CLERK_SECRET_KEY=sk_test_...</div>
            </div>
          </main>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
