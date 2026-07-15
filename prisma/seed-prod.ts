import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL || "admin@toret-to.it";
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!password) {
    console.log("INITIAL_ADMIN_PASSWORD non impostata, salto la creazione dell'admin.");
  } else {
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: "Titolare",
        passwordHash,
        role: "ADMIN",
      },
    });

    console.log(`Admin pronto: ${email}`);
  }

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
