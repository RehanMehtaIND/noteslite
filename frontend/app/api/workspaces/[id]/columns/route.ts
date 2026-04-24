import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const createColumnSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function POST(req: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const body = createColumnSchema.parse(await req.json());
    const { id: workspaceId } = await context.params;

    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId: user.id },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const lastColumn = await prisma.column.findFirst({
      where: { workspaceId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });

    const column = await prisma.column.create({
      data: {
        name: body.name,
        workspaceId,
        orderIndex: (lastColumn?.orderIndex ?? -1) + 1,
      },
    });

    const clientId = req.headers.get("x-client-id") || undefined;
    broadcast(workspaceId, "column:created", column, clientId);

    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Invalid column payload.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("Create column error", error);
    return NextResponse.json({ error: "Failed to create column." }, { status: 500 });
  }
}
