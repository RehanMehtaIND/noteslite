import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/backend/lib/prisma";
import { hashPassword } from "@/backend/lib/password";

const signUpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;
    const parsedPayload = signUpSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json({ error: "Invalid sign-up details." }, { status: 400 });
    }

    const { name, email, password } = parsedPayload.data;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash: hashPassword(password),
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Sign-up request failed", error);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}
