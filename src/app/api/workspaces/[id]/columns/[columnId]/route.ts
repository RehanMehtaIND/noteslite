import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

type RouteContext = {
  params: Promise<{ id: string; columnId: string }>;
};

const updateColumnSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function PATCH(req: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const body = updateColumnSchema.parse(await req.json());
    const { id: workspaceId, columnId } = await context.params;

    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId: user.id },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const existingColumn = await prisma.column.findFirst({
      where: { id: columnId, workspaceId },
      select: { id: true },
    });

    if (!existingColumn) {
      return NextResponse.json({ error: "Column not found." }, { status: 404 });
    }

    const column = await prisma.column.update({
      where: { id: columnId },
      data: { name: body.name },
    });

    const clientId = req.headers.get("x-client-id") || undefined;
    broadcast(workspaceId, "column:updated", column, clientId);

    return NextResponse.json({ column });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Invalid column payload.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("Update column error", error);
    return NextResponse.json({ error: "Failed to update column." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const { id: workspaceId, columnId } = await context.params;

    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId: user.id },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const existingColumn = await prisma.column.findFirst({
      where: { id: columnId, workspaceId },
      select: { id: true },
    });

    if (!existingColumn) {
      return NextResponse.json({ error: "Column not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.column.delete({
        where: { id: columnId },
      });

      const siblings = await tx.column.findMany({
        where: { workspaceId },
        orderBy: { orderIndex: "asc" },
        select: { id: true },
      });

      for (let index = 0; index < siblings.length; index += 1) {
        await tx.column.update({
          where: { id: siblings[index].id },
          data: { orderIndex: index },
        });
      }
    });

    const clientId = req.headers.get("x-client-id") || undefined;
    broadcast(workspaceId, "column:deleted", { id: columnId }, clientId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete column error", error);
    return NextResponse.json({ error: "Failed to delete column." }, { status: 500 });
  }
}

