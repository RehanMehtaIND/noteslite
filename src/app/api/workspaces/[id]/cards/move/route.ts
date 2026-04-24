import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const moveCardSchema = z.object({
  cardId: z.string().uuid(),
  toColumnId: z.string().uuid().nullable(),
  toIndex: z.number().int().min(0),
});

export async function PATCH(req: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const body = moveCardSchema.parse(await req.json());
    const { id: workspaceId } = await context.params;

    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId: user.id },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    if (body.toColumnId) {
      const targetColumn = await prisma.column.findFirst({
        where: { id: body.toColumnId, workspaceId },
        select: { id: true },
      });

      if (!targetColumn) {
        return NextResponse.json({ error: "Target column not found." }, { status: 404 });
      }
    }

    const card = await prisma.card.findFirst({
      where: { id: body.cardId, workspaceId },
      select: { id: true, columnId: true },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    const sourceColumnId = card.columnId;
    const targetColumnId = body.toColumnId;

    await prisma.$transaction(async (tx) => {
      const sourceSiblings = await tx.card.findMany({
        where: {
          workspaceId,
          columnId: sourceColumnId,
          id: { not: card.id },
        },
        orderBy: [{ positionY: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });

      for (let index = 0; index < sourceSiblings.length; index += 1) {
        await tx.card.update({
          where: { id: sourceSiblings[index].id },
          data: { positionY: index },
        });
      }

      const targetSiblings = await tx.card.findMany({
        where: {
          workspaceId,
          columnId: targetColumnId,
          id: { not: card.id },
        },
        orderBy: [{ positionY: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });

      const boundedIndex = Math.min(body.toIndex, targetSiblings.length);
      const reordered = [...targetSiblings];
      reordered.splice(boundedIndex, 0, { id: card.id });

      for (let index = 0; index < reordered.length; index += 1) {
        const item = reordered[index];

        await tx.card.update({
          where: { id: item.id },
          data: {
            columnId: targetColumnId,
            positionY: index,
          },
        });
      }
    });

    const movedCard = await prisma.card.findUnique({
      where: { id: body.cardId },
      include: { tags: true },
    });

    const clientId = req.headers.get("x-client-id") || undefined;
    broadcast(workspaceId, "card:moved", movedCard, clientId);

    return NextResponse.json({ card: movedCard });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Invalid move payload.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("Move card error", error);
    return NextResponse.json({ error: "Failed to move card." }, { status: 500 });
  }
}
