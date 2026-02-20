import "dotenv/config";
import "@/db";
import { createOrUpdatePermissions } from "@/scripts/createOrUpdatePermissions";
import { initializeDefaultRoles } from "@/scripts/initRoles";
import createSuperAdminAccount from "@/scripts/initSuperAdmin";
import initPaymentSettings from "@/scripts/initPaymentMethods";
import initCurrencySettings from "@/scripts/initCurrencySettings";
import prisma from "@/db/prisma";

async function main() {
  if (await createOrUpdatePermissions()) {
    await initializeDefaultRoles();
  }
  await createSuperAdminAccount();
  await initPaymentSettings();
  await initCurrencySettings();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
