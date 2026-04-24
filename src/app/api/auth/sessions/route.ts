import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionWithToken = session as any;
    const currentSessionToken = sessionWithToken.sessionToken;

    const activeSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      orderBy: {
        lastActiveAt: "desc",
      },
      select: {
        id: true,
        deviceName: true,
        browser: true,
        os: true,
        lastActiveAt: true,
        isActive: true,
        sessionToken: true,
      },
    });

    const sessionsResponse = activeSessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      browser: s.browser,
      os: s.os,
      lastActiveAt: s.lastActiveAt,
      isActive: s.isActive,
      isCurrent: s.sessionToken === currentSessionToken,
    }));

    return NextResponse.json(sessionsResponse);
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
