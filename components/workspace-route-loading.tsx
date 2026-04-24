"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/loading-screen";
import { readTeleportLoadingState } from "@/lib/loading-screen";

export default function WorkspaceRouteLoading() {
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    setWorkspaceName(readTeleportLoadingState()?.workspaceName ?? null);
  }, []);

  return (
    <LoadingScreen
      variant="workspace-open"
      workspaceName={workspaceName}
    />
  );
}
