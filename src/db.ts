// src/db.ts
import prisma from "@/db/prisma";

if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
}

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not defined.");
  process.exit(1);
}

prisma
  .$connect()
  .then(() => {
    console.log("Connected to MySQL via Prisma");
  })
  .catch((err: unknown) => {
    console.error("Error connecting to MySQL:", err);
    process.exit(1);
  });