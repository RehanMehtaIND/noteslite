import { redirect } from "next/navigation";

import AuthForm from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return <AuthForm />;
}
