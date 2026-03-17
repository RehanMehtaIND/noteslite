"use client";

import ClerkSignInPanel from "@/components/clerk-sign-in-panel";

export default function AuthPageShell({
  mode = "sign-in",
}: {
  mode?: "sign-in" | "sign-up";
}) {
  return <ClerkSignInPanel mode={mode} />;
}
