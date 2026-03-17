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
  let clerkId: string | null = null;

  try {
    ({ userId: clerkId } = await auth());
  } catch (error) {
    console.error("Clerk auth resolution failed", error);
    return null;
  }

  if (!clerkId) {
    return null;
  }

  // Try to find existing DB user
  let user: AuthenticatedUser | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, clerkId: true, name: true, email: true },
    });
  } catch (error) {
    console.error("Failed to fetch user from database", error);
    return null;
  }

  if (!user) {
    // First sign‑in — provision user from Clerk profile
    let clerkUser: Awaited<ReturnType<typeof currentUser>>;

    try {
      clerkUser = await currentUser();
    } catch (error) {
      console.error("Failed to resolve Clerk user profile", error);
      return null;
    }

    if (!clerkUser) {
      return null;
    }

    try {
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
    } catch (error) {
      console.error("Failed to provision database user", error);
      return null;
    }
  }

  return user;
}
