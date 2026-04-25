import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { AuthenticatedUser } from "@/lib/auth";

export const API_KEY_PREFIX = "nl_";

export const PLAN_KEY_LIMITS: Record<string, number> = {
  basic: 1,
  pro: 3,
};

export function getKeyLimit(plan: string): number {
  return PLAN_KEY_LIMITS[plan] ?? 1;
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const key = `${API_KEY_PREFIX}${raw}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 10); // "nl_" + 7 chars for display
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function getUserFromApiKey(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith(`Bearer ${API_KEY_PREFIX}`)) return null;

  const key = authHeader.slice("Bearer ".length).trim();
  const hash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    include: {
      user: { select: { id: true, googleId: true, name: true, email: true } },
    },
  });

  if (!apiKey || !apiKey.isActive) return null;

  // Fire-and-forget lastUsedAt update — don't block the request
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return apiKey.user;
}

/**
 * Resolves the authenticated user from either an API key (Bearer token) or
 * a NextAuth session cookie. API key takes precedence when both are present.
 */
export async function getAuthUser(req: Request): Promise<AuthenticatedUser | null> {
  const apiKeyUser = await getUserFromApiKey(req);
  if (apiKeyUser) return apiKeyUser;
  return getCurrentUser();
}
