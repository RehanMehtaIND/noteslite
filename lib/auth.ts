import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export type AuthenticatedUser = {
  id: string;
  clerkId: string;
  name: string;
  email: string;
};

/**
 * Get the current authenticated user from Clerk and resolve their DB record.
 * Creates the user row on first sign‑in (just‑in‑time provisioning).
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  // Try to find existing DB user
  let user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, clerkId: true, name: true, email: true },
  });

  if (!user) {
    // First sign‑in — provision user from Clerk profile
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return null;
    }

    user = await prisma.user.create({
      data: {
        clerkId,
        email:
          clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkId}@placeholder.local`,
        name:
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
          "User",
      },
      select: { id: true, clerkId: true, name: true, email: true },
    });
  }

  return user;
}
