import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  theme: z.string().trim().max(40).optional(),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const workspaces = await prisma.workspace.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { cards: true, columns: true } },
    },
  });

  return NextResponse.json({ workspaces });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const body = createWorkspaceSchema.parse(await req.json());

    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        theme: body.theme ?? "default",
        userId: user.id,
      },
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Invalid payload.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("Create workspace error", error);
    return NextResponse.json({ error: "Failed to create workspace." }, { status: 500 });
  }
}
