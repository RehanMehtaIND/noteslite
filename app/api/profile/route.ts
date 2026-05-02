
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/prisma";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Extract what we need safely
    const payload = {
      avatarMode: (dbUser as any).avatarMode ?? "initials",
      avatarUrl: (dbUser as any).avatarUrl,
      displayName: (dbUser as any).displayName,
      showEmail: (dbUser as any).showEmail ?? false,
      theme: (dbUser as any).theme ?? "standard",
      dashboardBackground: (dbUser as any).dashboardBackground,
    };

    return NextResponse.json(payload);
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
  theme: z.string().optional(),
  dashboardBackground: z.string().nullable().optional(),
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
        ...(body.theme !== undefined && { theme: body.theme }),
        ...(body.dashboardBackground !== undefined && { dashboardBackground: body.dashboardBackground }),
      },
    });

    // Safely return updated fields
    const payload = {
      avatarMode: (updatedUser as any).avatarMode ?? "initials",
      avatarUrl: (updatedUser as any).avatarUrl,
      displayName: (updatedUser as any).displayName,
      showEmail: (updatedUser as any).showEmail ?? false,
      theme: (updatedUser as any).theme ?? "standard",
      dashboardBackground: (updatedUser as any).dashboardBackground,
    };

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Failed to update profile settings:", error);
    return NextResponse.json({ error: "Failed to update profile settings" }, { status: 500 });
  }
}
