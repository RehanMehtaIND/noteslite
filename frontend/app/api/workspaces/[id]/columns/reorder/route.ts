import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const reorderColumnsSchema = z.object({
  orderedColumnIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(req: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const body = reorderColumnsSchema.parse(await req.json());
    const { id: workspaceId } = await context.params;

    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId: user.id },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const columns = await prisma.column.findMany({
      where: { workspaceId },
      select: { id: true },
      orderBy: { orderIndex: "asc" },
    });

    if (columns.length !== body.orderedColumnIds.length) {
      return NextResponse.json({ error: "Column count mismatch." }, { status: 400 });
    }

    const existingIds = new Set(columns.map((column) => column.id));
    const providedIds = new Set(body.orderedColumnIds);

    if (existingIds.size !== providedIds.size) {
      return NextResponse.json({ error: "Duplicate columns in payload." }, { status: 400 });
    }

    for (const id of body.orderedColumnIds) {
      if (!existingIds.has(id)) {
        return NextResponse.json({ error: "Payload contains unknown column." }, { status: 400 });
      }
    }

    await prisma.$transaction(
      body.orderedColumnIds.map((columnId, index) =>
        prisma.column.update({
          where: { id: columnId },
          data: { orderIndex: index },
        }),
      ),
    );

    const updatedColumns = await prisma.column.findMany({
      where: { workspaceId },
      orderBy: { orderIndex: "asc" },
    });

    const clientId = req.headers.get("x-client-id");
    broadcast(workspaceId, "columns:reordered", { columns: updatedColumns }, clientId || undefined);

    return NextResponse.json({ columns: updatedColumns });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Invalid reorder payload.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("Reorder columns error", error);
    return NextResponse.json({ error: "Failed to reorder columns." }, { status: 500 });
  }
}
