import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

type RouteContext = {
  params: Promise<{ id: string; cardId: string }>;
};

const updateCardSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    coverImage: z.string().trim().url().max(2048).nullable().optional(),
    content: z.any().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "No updates provided.",
  });

export async function PATCH(req: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const body = updateCardSchema.parse(await req.json());
    const { id: workspaceId, cardId } = await context.params;

    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId: user.id },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const existingCard = await prisma.card.findFirst({
      where: { id: cardId, workspaceId },
      select: { id: true },
    });

    if (!existingCard) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    const data: Prisma.CardUpdateInput = {};

    if (body.title !== undefined) {
      data.title = body.title;
    }

    if (body.coverImage !== undefined) {
      data.coverImage = body.coverImage;
    }

    if (body.content !== undefined) {
      data.content = body.content === null ? Prisma.JsonNull : (body.content as Prisma.InputJsonValue);
    }

    const card = await prisma.card.update({
      where: { id: cardId },
      data,
      include: { tags: true },
    });

    const clientId = req.headers.get("x-client-id") || undefined;
    broadcast(workspaceId, "card:updated", card, clientId);

    return NextResponse.json({ card });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Invalid card payload.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("Update card error", error);
    return NextResponse.json({ error: "Failed to update card." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const { id: workspaceId, cardId } = await context.params;

    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId: user.id },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const existingCard = await prisma.card.findFirst({
      where: { id: cardId, workspaceId },
      select: { id: true, columnId: true },
    });

    if (!existingCard) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.card.delete({
        where: { id: cardId },
      });

      const siblings = await tx.card.findMany({
        where: {
          workspaceId,
          columnId: existingCard.columnId,
        },
        orderBy: [{ positionY: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });

      for (let index = 0; index < siblings.length; index += 1) {
        await tx.card.update({
          where: { id: siblings[index].id },
          data: { positionY: index },
        });
      }
    });

    const clientId = req.headers.get("x-client-id") || undefined;
    broadcast(workspaceId, "card:deleted", { id: cardId }, clientId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete card error", error);
    return NextResponse.json({ error: "Failed to delete card." }, { status: 500 });
  }
}
