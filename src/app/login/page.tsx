import Image from "next/image";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.userId) {
    redirect(session.role === "ADMIN" ? "/admin" : "/dipendente");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-white px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Image src="/logo.png" alt="Toretto" width={280} height={81} priority />
        <p className="text-sm text-zinc-500">Accedi con le tue credenziali</p>
      </div>
      <LoginForm />
    </div>
  );
}
