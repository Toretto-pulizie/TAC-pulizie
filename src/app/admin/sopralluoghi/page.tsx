import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatDateLabel } from "@/lib/dates";
import { SopralluogoRow } from "./SopralluogoRow";

export default async function SopralluoghiAdminPage() {
  await requireModule("sopralluoghi");

  const sopralluoghi = await prisma.sopralluogo.findMany({
    include: { effettuatoDa: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <h1 className="text-xl font-semibold text-zinc-900">Sopralluoghi</h1>

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white [contain:inline-size]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Luogo</th>
              <th className="px-4 py-3 font-medium">Effettuato da</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sopralluoghi.map((s) => (
              <SopralluogoRow
                key={s.id}
                id={s.id}
                dataLabel={formatDateLabel(s.dataSopralluogo ?? s.createdAt)}
                clienteNome={s.clienteNome}
                luogoCitta={s.luogoCitta}
                effettuatoDaName={s.effettuatoDa.name}
              />
            ))}
            {sopralluoghi.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  Nessun sopralluogo compilato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
