import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        emailVerifyOtp: otp,
        emailVerifyExpiry: expiry,
      },
    });

    // TODO: Actually send the OTP via nodemailer or resend
    console.log(`[Email Mock] Sent OTP ${otp} to ${session.user.email}`);

    return NextResponse.json({ success: true, otp }); // Returning OTP for mock purposes
  } catch (error) {
    console.error("Email verification send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
