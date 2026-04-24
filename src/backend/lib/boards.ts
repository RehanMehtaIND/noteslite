import { prisma } from "@/lib/prisma";

/**
 * Create a default workspace for a newly provisioned user.
 */
export async function createDefaultWorkspace(userId: string) {
  return prisma.workspace.create({
    data: {
      name: "My Workspace",
      theme: "default",
      userId,
    },
  });
}
