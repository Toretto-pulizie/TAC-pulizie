import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { LeaveRequestForm } from "./LeaveRequestForm";
import { LeaveRequestHistory } from "./LeaveRequestHistory";

export default async function PermessiPage() {
  const session = await verifySession();

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/dipendente" className="shrink-0 text-sm text-zinc-500">
          ← Indietro
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">
          Richiedi permesso
        </h1>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:max-w-md">
          <LeaveRequestForm />
        </div>
        <LeaveRequestHistory requests={requests} />
      </div>
    </div>
  );
}
