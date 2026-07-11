import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "../../AdminNav";
import { EditEmployeeForm } from "./EditEmployeeForm";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const employee = await prisma.user.findUnique({ where: { id } });
  if (!employee) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="dipendenti" />
      <div className="flex flex-col gap-6 p-4 sm:max-w-md sm:p-8">
        <h1 className="text-lg font-semibold text-zinc-900">
          Modifica dipendente
        </h1>
        <EditEmployeeForm
          id={employee.id}
          name={employee.name}
          cognome={employee.cognome}
          telefono={employee.telefono}
          email={employee.email}
          role={employee.role}
        />
      </div>
    </div>
  );
}
