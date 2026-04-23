import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WorkspaceBoardPageShell from "@/components/workspace-board-page-shell";

type WorkspaceBoardPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspaceBoardPage({ params }: WorkspaceBoardPageProps) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId: user.id },
    include: {
      columns: { orderBy: { orderIndex: "asc" } },
      cards: {
        orderBy: [{ positionY: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!workspace) {
    notFound();
  }

  // Transform workspace data for NotesliteWorkspace
  const cardsByColumn = new Map<string, any[]>();
  const cardsData: Record<string, any> = {};

  for (const card of workspace.cards) {
    const colId = card.columnId || "__unassigned__";
    if (!cardsByColumn.has(colId)) cardsByColumn.set(colId, []);
    cardsByColumn.get(colId)!.push(card.title);

    cardsData[card.title] = {
      icon: "📄",
      coverA: "#7A9ABB", 
      coverB: "#9ABACB",
      tags: [],
      blocks: Array.isArray(card.content) && card.content.length > 0 
        ? card.content 
        : [{ t: "h1", v: card.title }, { t: "p", v: "" }],
    };
  }

  function getColumnColor(name: string) {
    const lower = name.toLowerCase();
    if (lower.includes("not started")) return "#E57373"; // Red
    if (lower.includes("ongoing")) return "#FFB74D"; // Yellow
    if (lower.includes("completed") || lower.includes("done")) return "#81C784"; // Green
    
    if (lower.includes("income")) return "#4DB6AC"; // Teal
    if (lower.includes("needs")) return "#64B5F6"; // Blue
    if (lower.includes("wants")) return "#BA68C8"; // Purple
    
    if (lower.includes("ideas")) return "#FF8A65"; // Orange
    if (lower.includes("drafts")) return "#90A4AE"; // Blue Grey
    if (lower.includes("published")) return "#7986CB"; // Indigo
    
    return "#C07850"; // Default
  }

  const columns = workspace.columns.map((col, index) => ({
    id: col.id,
    type: "column",
    x: 50 + index * 340,
    y: 50,
    w: 232,
    color: getColumnColor(col.name || ""),
    title: col.name || "Untitled",
    desc: "",
    cards: cardsByColumn.get(col.id) || [],
    z: 1,
  }));

  const unassigned = cardsByColumn.get("__unassigned__");
  if (unassigned && unassigned.length > 0) {
    columns.push({
      id: "unassigned",
      type: "column",
      x: 50 + columns.length * 340,
      y: 50,
      w: 232,
      color: "#5A7A9A",
      title: "Unassigned",
      desc: "",
      cards: unassigned,
      z: 1,
    });
  }

  const initialData = {
    columns,
    canvasItems: columns.map(c => ({ ...c })),
    cardsData,
  };

  return <WorkspaceBoardPageShell workspaceId={workspaceId} initialData={initialData} />;
}