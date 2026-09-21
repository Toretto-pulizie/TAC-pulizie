import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { homePathFor } from "@/lib/dal";

export default async function Home() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  redirect(homePathFor(session.role));
}
