"use client";

import GoogleAuthPanel from "@/components/google-auth-panel";

export default function AuthPageShell({
  mode = "sign-in",
}: {
  mode?: "sign-in" | "sign-up";
}) {
  return <GoogleAuthPanel mode={mode} />;
}
