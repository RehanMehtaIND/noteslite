"use client";

import NotesliteWorkspace from "@/components/noteslite-workspace/NotesliteWorkspace";

export default function WorkspaceBoardPageShell({
  workspaceId,
  initialData,
}: {
  workspaceId: string;
  initialData?: any;
}) {
  return <NotesliteWorkspace initialData={initialData} workspaceId={workspaceId} />;
}
