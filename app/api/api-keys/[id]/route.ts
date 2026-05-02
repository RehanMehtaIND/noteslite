import { NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
    select: { userId: true, isActive: true },
  });

  if (!apiKey || apiKey.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!apiKey.isActive) {
    return NextResponse.json({ error: "Key already revoked." }, { status: 409 });
  }

  await prisma.apiKey.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
