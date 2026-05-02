import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/prisma";
import { generateApiKey, getKeyLimit } from "@/backend/lib/api-key-auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const [keys, dbUser] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    }),
  ]);

  const plan = dbUser?.plan ?? "basic";
  const limit = getKeyLimit(plan);

  return NextResponse.json({ keys, plan, limit });
}

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true },
  });

  const plan = dbUser?.plan ?? "basic";
  const limit = getKeyLimit(plan);

  const activeCount = await prisma.apiKey.count({
    where: { userId: user.id, isActive: true },
  });

  if (activeCount >= limit) {
    return NextResponse.json(
      { error: `API key limit reached for your ${plan} plan (max ${limit}).` },
      { status: 403 }
    );
  }

  try {
    const body = createKeySchema.parse(await req.json());
    const { key, hash, prefix } = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: body.name,
        keyHash: hash,
        prefix,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
      },
    });

    // Return the raw key ONCE — it is never stored and cannot be recovered
    return NextResponse.json({ ...apiKey, key }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    console.error("Create API key error", error);
    return NextResponse.json({ error: "Failed to create API key." }, { status: 500 });
  }
}
