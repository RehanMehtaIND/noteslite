import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    theme: z.string().trim().max(40).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "No updates provided.",
  });

export async function GET(_: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await context.params;

  const workspace = await prisma.workspace.findFirst({
    where: { id, userId: user.id },
    include: {
      columns: { orderBy: { orderIndex: "asc" } },
      cards: { orderBy: { createdAt: "asc" }, include: { tags: true } },
      tags: true,
      connections: true,
    },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  return NextResponse.json({ workspace });
}

export async function PATCH(req: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const body = updateWorkspaceSchema.parse(await req.json());
    const { id } = await context.params;

    const existing = await prisma.workspace.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Invalid workspace payload.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("Update workspace error", error);
    return NextResponse.json({ error: "Failed to update workspace." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    const result = await prisma.workspace.deleteMany({
      where: { id, userId: user.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete workspace error", error);
    return NextResponse.json({ error: "Failed to delete workspace." }, { status: 500 });
  }
}
