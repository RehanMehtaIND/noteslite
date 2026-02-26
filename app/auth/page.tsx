import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

import { getCurrentUser } from "@/lib/auth";

export default async function AuthPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e3dbd3] px-4">
      <SignIn routing="hash" />
    </div>
  );
}
