import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Since we appended sessionToken in the session callback, we can cast and extract it
    const sessionWithToken = session as any;
    const sessionToken = sessionWithToken.sessionToken;

    if (!sessionToken) {
      console.warn("[Heartbeat] No session token found for user:", session.user.id);
      return NextResponse.json({ error: "No session token found" }, { status: 400 });
    }

    try {
      await prisma.session.update({
        where: { sessionToken },
        data: { lastActiveAt: new Date() },
      });
      // console.log("[Heartbeat] Updated lastActiveAt for session:", sessionToken);
    } catch (dbError) {
      console.error("[Heartbeat] Failed to update session in DB:", dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session heartbeat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
