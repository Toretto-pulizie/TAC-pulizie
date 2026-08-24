import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { EditEmployeeForm } from "./EditEmployeeForm";
import { PermissionsEditor } from "./PermissionsEditor";

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
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-lg font-semibold text-zinc-900">
        Modifica utente
      </h1>
      <div className="sm:max-w-md">
        <EditEmployeeForm
          id={employee.id}
          name={employee.name}
          cognome={employee.cognome}
          telefono={employee.telefono}
          email={employee.email}
          role={employee.role}
        />
      </div>
      {employee.role === "EMPLOYEE" && (
        <div className="sm:max-w-2xl">
          <PermissionsEditor
            userId={employee.id}
            initialAllowed={employee.allowedModules}
          />
        </div>
      )}
    </div>
  );
}
