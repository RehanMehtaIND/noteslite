import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
};

declare global {
  var globalPrisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.globalPrisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.globalPrisma = prisma;
  console.log("Prisma Client Initialized. Models:", Object.keys(prisma).filter(k => !k.startsWith("_") && !k.startsWith("$")));
}
