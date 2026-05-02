import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/prisma";

const seedCardSchema = z.object({
  title: z.string().trim().min(1).max(160),
  columnIndex: z.number().int().min(0),
});

const seedSchema = z.object({
  workspaceId: z.string().uuid(),
  columns: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
  cards: z.array(seedCardSchema).max(100),
});

/**
 * POST /api/workspaces/seed
 *
 * Batch-creates columns and starter cards for a workspace in a single
 * request instead of N+M sequential API calls.  This dramatically cuts
 * the time needed to create a workspace from a template.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const body = seedSchema.parse(await req.json());

    // Verify workspace ownership
    const workspace = await prisma.workspace.findFirst({
      where: { id: body.workspaceId, userId: user.id },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    // Get current max orderIndex so we don't clash with existing columns
    const lastColumn = await prisma.column.findFirst({
      where: { workspaceId: body.workspaceId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });

    const baseOrderIndex = (lastColumn?.orderIndex ?? -1) + 1;

    // Batch-create all columns in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create columns
      const columnIds: string[] = [];
      for (let i = 0; i < body.columns.length; i++) {
        const col = await tx.column.create({
          data: {
            name: body.columns[i],
            workspaceId: body.workspaceId,
            orderIndex: baseOrderIndex + i,
          },
          select: { id: true },
        });
        columnIds.push(col.id);
      }

      // Create cards (all at once)
      const cardCreates = body.cards
        .filter((card) => {
          const colId = columnIds[card.columnIndex];
          return !!colId;
        })
        .map((card, idx) => {
          const colId = columnIds[card.columnIndex];
          return tx.card.create({
            data: {
              title: card.title,
              workspaceId: body.workspaceId,
              columnId: colId,
              positionY: idx,
            },
            select: { id: true },
          });
        });

      await Promise.all(cardCreates);

      return { columnIds, columnsCreated: columnIds.length, cardsCreated: cardCreates.length };
    });

    return NextResponse.json(
      {
        ok: true,
        columnsCreated: result.columnsCreated,
        cardsCreated: result.cardsCreated,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Invalid seed payload.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("Seed workspace error", error);
    return NextResponse.json({ error: "Failed to seed workspace." }, { status: 500 });
  }
}
