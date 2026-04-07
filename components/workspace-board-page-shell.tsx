"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import WorkspaceBoardClient from "@/components/workspace-board-client";

export default function WorkspaceBoardPageShell({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!userId) {
      router.replace("/auth");
    }
  }, [isLoaded, router, userId]);

  if (!isLoaded || !userId) {
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

  return <WorkspaceBoardClient workspaceId={workspaceId} />;
}
