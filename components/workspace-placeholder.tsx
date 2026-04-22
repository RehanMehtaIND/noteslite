"use client";

import { signOut, useSession } from "next-auth/react";

function getInitials(value: string) {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "NL";
  }

  return parts.map((part) => part[0]).join("").toUpperCase();
}

export default function WorkspacePlaceholder() {
  const { data: session } = useSession();
  const userName = session?.user?.name || session?.user?.email || "Notes User";
  const avatar = getInitials(userName);

  return (
    <div className="relative min-h-screen bg-[linear-gradient(180deg,#e8e2d9_0%,#dfd5c8_100%)] px-5 py-6 text-[#3a3530] sm:px-8 sm:py-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-[#dbd3c8] bg-[#f2ede6]/90 px-5 py-3 backdrop-blur sm:px-7">
        <h1 className="[font-family:'Cinzel','Times_New_Roman',serif] text-[22px] font-bold uppercase tracking-[0.15em] text-[#3a3530] sm:text-[26px]">
          NOTESLITE
        </h1>
        <button
          type="button"
          onClick={() => {
            void signOut({ callbackUrl: "/auth/sign-in" });
          }}
          className="rounded-full border border-[#c8c0b6] bg-[#ede8e0] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2b2b2b] transition hover:bg-[#e1dbd1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b2b2b]"
        >
          Sign Out
        </button>
      </header>

      <main className="mx-auto mt-24 flex w-full max-w-6xl items-center justify-center">
        <section className="flex w-full max-w-lg flex-col items-center rounded-[24px] border border-[#d8d0c6] bg-[#faf7f2] px-8 py-12 text-center shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#cec5bb] bg-[#ede8e0] text-[#5c5752]">
            <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
              <path
                d="M7 3h8l4 4v14H7V3zm8 1.5V8h3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 12h6M10 16h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-[18px] font-semibold text-[#3a3530]">Workspace Placeholder</h2>
          <p className="mt-2 text-[14px] leading-7 text-[#5c5752]">Your notes will appear here.</p>
        </section>
      </main>

      <div className="pointer-events-none fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#f5f1ea] bg-[#2b2b2b] text-[14px] font-semibold uppercase tracking-[0.1em] text-white shadow-[0_8px_20px_rgba(0,0,0,0.2)]">
        {avatar}
      </div>
    </div>
  );
}
