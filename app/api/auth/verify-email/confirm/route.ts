import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otp } = await req.json();
    if (!otp) {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.emailVerifyOtp || !user.emailVerifyExpiry) {
      return NextResponse.json({ error: "No pending verification" }, { status: 400 });
    }

    if (new Date() > user.emailVerifyExpiry) {
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    if (user.emailVerifyOtp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        emailVerified: true,
        emailVerifyOtp: null,
        emailVerifyExpiry: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email verification confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
