import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL || "admin@toret-to.it";
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!password) {
    console.log("INITIAL_ADMIN_PASSWORD non impostata, salto la creazione dell'admin.");
    return;
  }

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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
