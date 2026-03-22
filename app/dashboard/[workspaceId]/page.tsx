import WorkspaceBoardPageShell from "@/components/workspace-board-page-shell";

type WorkspaceBoardPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspaceBoardPage({ params }: WorkspaceBoardPageProps) {
  const { workspaceId } = await params;

  return <WorkspaceBoardPageShell workspaceId={workspaceId} />;
}