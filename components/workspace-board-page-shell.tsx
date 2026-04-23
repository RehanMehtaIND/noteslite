"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import NotesliteWorkspace from "@/components/noteslite-workspace/NotesliteWorkspace";

export default function WorkspaceBoardPageShell({
  workspaceId,
  initialData,
}: {
  workspaceId: string;
  initialData?: any;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session) {
      router.replace("/auth/sign-in");
    }
  }, [router, session, status]);

  if (status === "loading" || !session) {
    return (
      <div className="workspace-board-theme min-h-screen bg-[var(--board-canvas)] px-6 py-10 text-[color:var(--board-text)]">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-[color:var(--board-shell-border)] bg-[var(--board-shell-bg)] p-6 shadow-[var(--board-shadow-shell)] backdrop-blur-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--board-text-soft)]">
            Loading
          </p>
          <p className="mt-3 text-[24px] leading-tight tracking-[0.03em] text-[color:var(--board-text-strong)] [font-family:'Cormorant_Garamond','Times_New_Roman',serif]">
            Preparing your board workspace.
          </p>
        </div>
      </div>
    );
  }

  return <NotesliteWorkspace initialData={initialData} />;
}
