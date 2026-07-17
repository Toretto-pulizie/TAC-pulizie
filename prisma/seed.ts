import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("admin1234", 10);
  const employeePasswordHash = await bcrypt.hash("dipendente1234", 10);

  await prisma.user.upsert({
    where: { email: "admin@toret-to.it" },
    update: {},
    create: {
      email: "admin@toret-to.it",
      name: "Titolare",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "maria@toret-to.it" },
    update: {},
    create: {
      email: "maria@toret-to.it",
      name: "Maria",
      passwordHash: employeePasswordHash,
      role: "EMPLOYEE",
    },
  });

  await prisma.user.upsert({
    where: { email: "giulia@toret-to.it" },
    update: {},
    create: {
      email: "giulia@toret-to.it",
      name: "Giulia",
      passwordHash: employeePasswordHash,
      role: "EMPLOYEE",
    },
  });

  const defaultLabels: { tipo: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE"; etichetta: string }[] = [
    { tipo: "ONE_SHOT", etichetta: "Una tantum" },
    { tipo: "PASS_SETTIMANALE", etichetta: "Abbonamento settimanale" },
    { tipo: "PASS_MENSILE", etichetta: "Abbonamento mensile" },
  ];
  for (const { tipo, etichetta } of defaultLabels) {
    await prisma.serviceTypeLabel.upsert({
      where: { tipo },
      update: {},
      create: { tipo, etichetta },
    });
  }

  const tipiPrestazioneCount = await prisma.tipoPrestazione.count();
  if (tipiPrestazioneCount === 0) {
    await prisma.tipoPrestazione.createMany({
      data: [
        { etichetta: "PRESTAZIONE ORDINARIA DI PULIZIA UFFICI", ordine: 1 },
        { etichetta: "PRESTAZIONE ORDINARIA DI PULIZIA APPARTAMENTI", ordine: 2 },
        { etichetta: "PRESTAZIONE STRAORDINARIA", ordine: 3 },
        { etichetta: "PULIZIA DI FINE CANTIERE", ordine: 4 },
      ],
    });
  }

  console.log("Seed completato.");
  console.log("Admin: admin@toret-to.it / admin1234");
  console.log("Dipendenti: maria@toret-to.it e giulia@toret-to.it / dipendente1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
