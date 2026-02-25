import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { INITIAL_BOARD_TEMPLATES } from "@/lib/boards";
import { prisma } from "@/lib/prisma";

const createBoardSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const boards = await prisma.board.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ boards });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const payload = createBoardSchema.safeParse(await req.json().catch(() => ({})));

    if (!payload.success) {
      return NextResponse.json({ error: "Invalid board payload." }, { status: 400 });
    }

    const template = INITIAL_BOARD_TEMPLATES[0];
    const board = await prisma.board.create({
      data: {
        userId: user.id,
        title: (payload.data.title ?? "NEW BOARD").toUpperCase(),
        image: template.image,
        backgroundMode: "image",
        backgroundColor: template.backgroundColor,
        gradientFrom: template.gradientFrom,
        gradientTo: template.gradientTo,
      },
    });

    return NextResponse.json({ board }, { status: 201 });
  } catch (error) {
    console.error("Create board error", error);
    return NextResponse.json({ error: "Failed to create board." }, { status: 500 });
  }
}
