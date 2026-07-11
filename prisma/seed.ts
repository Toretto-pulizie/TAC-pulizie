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

  const clientA = await prisma.client.upsert({
    where: { id: "seed-client-rossi" },
    update: {},
    create: {
      id: "seed-client-rossi",
      name: "Famiglia Rossi",
    },
  });

  const clientB = await prisma.client.upsert({
    where: { id: "seed-client-ufficio" },
    update: {},
    create: {
      id: "seed-client-ufficio",
      name: "Studio Legale Bianchi",
    },
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
