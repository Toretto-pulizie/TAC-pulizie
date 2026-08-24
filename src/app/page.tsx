import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentUser, homePathFor } from "@/lib/dal";

export default async function Home() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  const user = await getCurrentUser();
  redirect(homePathFor(session.role, user?.allowedModules ?? []));
}
