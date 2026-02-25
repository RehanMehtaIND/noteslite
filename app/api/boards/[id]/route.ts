import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const hexColor = /^#[0-9A-Fa-f]{6}$/;

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateBoardSchema = z
  .object({
    title: z.string().trim().min(1).max(80).optional(),
    image: z.string().url().nullable().optional(),
    backgroundMode: z.enum(["image", "color", "gradient"]).optional(),
    backgroundColor: z
      .string()
      .regex(hexColor, "Background color must be a hex value like #aabbcc")
      .optional(),
    gradientFrom: z
      .string()
      .regex(hexColor, "Gradient start must be a hex value like #aabbcc")
      .optional(),
    gradientTo: z
      .string()
      .regex(hexColor, "Gradient end must be a hex value like #aabbcc")
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No updates provided.",
  });

export async function PATCH(req: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const payload = updateBoardSchema.parse(await req.json());
    const { id } = await context.params;

    const existing = await prisma.board.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Board not found." }, { status: 404 });
    }

    const board = await prisma.board.update({
      where: { id },
      data: {
        ...payload,
        ...(payload.title ? { title: payload.title.toUpperCase() } : {}),
      },
    });

    return NextResponse.json({ board });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? "Invalid board payload.";
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    console.error("Update board error", error);
    return NextResponse.json({ error: "Failed to update board." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    const result = await prisma.board.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Board not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete board error", error);
    return NextResponse.json({ error: "Failed to delete board." }, { status: 500 });
  }
}
