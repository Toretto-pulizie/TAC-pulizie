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

  const clientAData = {
    name: "Famiglia Rossi",
    ragioneSociale: "Famiglia Rossi",
    indirizzo: "Via Roma 1",
    citta: "Milano",
    cap: "20100",
    provincia: "MI",
  };
  const clientA = await prisma.client.upsert({
    where: { id: "seed-client-rossi" },
    update: clientAData,
    create: { id: "seed-client-rossi", ...clientAData },
  });

  const clientBData = {
    name: "Studio Legale Bianchi",
    ragioneSociale: "Studio Legale Bianchi",
    indirizzo: "Corso Italia 10",
    citta: "Milano",
    cap: "20100",
    provincia: "MI",
  };
  const clientB = await prisma.client.upsert({
    where: { id: "seed-client-ufficio" },
    update: clientBData,
    create: { id: "seed-client-ufficio", ...clientBData },
  });

  await prisma.site.upsert({
    where: { id: "seed-site-rossi-casa" },
    update: {},
    create: {
      id: "seed-site-rossi-casa",
      clientId: clientA.id,
      name: "Casa",
      address: "Via Roma 1, Milano",
    },
  });

  await prisma.site.upsert({
    where: { id: "seed-site-ufficio-sede" },
    update: {},
    create: {
      id: "seed-site-ufficio-sede",
      clientId: clientB.id,
      name: "Sede centrale",
      address: "Corso Italia 10, Milano",
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
