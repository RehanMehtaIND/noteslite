import { NextResponse } from "next/server";
import { getAuthUser } from "@/backend/lib/api-key-auth";
import { prisma } from "@/backend/lib/prisma";
import { z } from "zod";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notes = await prisma.quickNote.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Failed to fetch quick notes:", error);
    return NextResponse.json({ error: "Failed to fetch quick notes" }, { status: 500 });
  }
}

const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(50, "Title must be 50 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional().default(""),
  color: z.string().optional().default("#5A7A9A"),
  pinned: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const body = createNoteSchema.parse(json);

    const note = await prisma.quickNote.create({
      data: {
        userId: user.id,
        title: body.title,
        description: body.description,
        color: body.color,
        pinned: body.pinned,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Failed to create quick note:", error);
    return NextResponse.json({ error: "Failed to create quick note" }, { status: 500 });
  }
}
