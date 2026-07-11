import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "../AdminNav";
import { EmployeeForm } from "./EmployeeForm";
import { EmployeeRow } from "./EmployeeRow";

export default async function DipendentiPage() {
  await requireAdmin();
  const employees = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="dipendenti" />
      <div className="flex flex-col gap-6 p-4 sm:p-8">
        <EmployeeForm />

        <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Cognome</th>
                <th className="px-4 py-3 font-medium">Telefono</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Ruolo</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <EmployeeRow
                  key={e.id}
                  id={e.id}
                  name={e.name}
                  cognome={e.cognome}
                  telefono={e.telefono}
                  email={e.email}
                  role={e.role}
                  active={e.active}
                />
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
