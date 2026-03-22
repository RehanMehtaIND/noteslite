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
      <div className="min-h-screen bg-[linear-gradient(180deg,#ebe6de_0%,#e3cdc0_100%)] px-6 py-10 text-[#64666b]">
        Loading board...
      </div>
    );
  }

  return <WorkspaceBoardClient workspaceId={workspaceId} />;
}