import { redirect } from "next/navigation";

import DashboardClient from "@/components/dashboard-client";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  return <DashboardClient userName={user.name} />;
}
