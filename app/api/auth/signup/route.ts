import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { buildInitialBoards } from "@/lib/boards";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/session";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(req: Request) {
  try {
    const body = signupSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    await prisma.board.createMany({
      data: buildInitialBoards(user.id),
    });

    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ user }, { status: 201 });

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? "Invalid request payload.";
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    console.error("Signup error", error);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
