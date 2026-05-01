import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/prisma";
import { broadcast } from "@/backend/lib/sse";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const createCardSchema = z.object({
  title: z.string().trim().min(1).max(160),
  columnId: z.string().uuid().optional().nullable(),
  coverImage: z.string().trim().url().max(2048).optional().nullable(),
  content: z.any().optional(),
});

export async function POST(req: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const body = createCardSchema.parse(await req.json());
    const { id: workspaceId } = await context.params;

    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId: user.id },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    if (body.columnId) {
      const column = await prisma.column.findFirst({
        where: { id: body.columnId, workspaceId },
        select: { id: true },
      });

      if (!column) {
        return NextResponse.json({ error: "Column not found." }, { status: 404 });
      }
    }

    const lastCard = await prisma.card.findFirst({
      where: {
        workspaceId,
        columnId: body.columnId ?? null,
      },
      orderBy: { positionY: "desc" },
      select: { positionY: true },
    });

    const card = await prisma.card.create({
      data: {
        title: body.title,
        workspaceId,
        columnId: body.columnId ?? null,
        coverImage: body.coverImage ?? null,
        content: body.content as Prisma.InputJsonValue | undefined,
        positionY: (lastCard?.positionY ?? -1) + 1,
      },
      include: { tags: true },
    });

    const clientId = req.headers.get("x-client-id") || undefined;
    broadcast(workspaceId, "card:created", card, clientId);

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Invalid card payload.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("Create card error", error);
    return NextResponse.json({ error: "Failed to create card." }, { status: 500 });
  }
}
