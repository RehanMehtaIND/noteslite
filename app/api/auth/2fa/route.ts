import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enabled, method } = await req.json();

    const updateData: Record<string, string | boolean> = {};
    if (typeof enabled === "boolean") {
      updateData.twoFactorEnabled = enabled;
    }
    if (typeof method === "string") {
      updateData.twoFactorMethod = method;
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      twoFactorEnabled: updatedUser.twoFactorEnabled,
      twoFactorMethod: updatedUser.twoFactorMethod,
    });
  } catch (error) {
    console.error("2FA update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
