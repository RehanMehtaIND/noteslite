import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        avatarMode: true,
        avatarUrl: true,
        displayName: true,
        showEmail: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(dbUser);
  } catch (error) {
    console.error("Failed to fetch profile settings:", error);
    return NextResponse.json({ error: "Failed to fetch profile settings" }, { status: 500 });
  }
}

const updateProfileSchema = z.object({
  avatarMode: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  showEmail: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const body = updateProfileSchema.parse(json);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.avatarMode !== undefined && { avatarMode: body.avatarMode }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.showEmail !== undefined && { showEmail: body.showEmail }),
      },
      select: {
        avatarMode: true,
        avatarUrl: true,
        displayName: true,
        showEmail: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Failed to update profile settings:", error);
    return NextResponse.json({ error: "Failed to update profile settings" }, { status: 500 });
  }
}
