import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import prisma from "@/db/prisma";

type ImportTarget = {
  model: keyof typeof prisma;
  candidates: string[];
};

const IMPORT_TARGETS: ImportTarget[] = [
  { model: "client", candidates: ["clients"] },
  { model: "clientShop", candidates: ["clientshops"] },
  { model: "clientCompany", candidates: ["clientcompanies"] },
  { model: "address", candidates: ["addresses"] },
  { model: "permission", candidates: ["permissions"] },
  { model: "dashboardRole", candidates: ["dashboardroles"] },
  { model: "dashboardUser", candidates: ["dashboardusers"] },
  { model: "deliveryOption", candidates: ["deliveryoptions"] },
  { model: "paymentMethod", candidates: ["paymentmethods"] },
  { model: "currencySettings", candidates: ["currencysettings"] },
  { model: "productAttribute", candidates: ["productattributes"] },
  { model: "brand", candidates: ["brands"] },
  { model: "categorie", candidates: ["categories"] },
  { model: "subCategorie", candidates: ["subcategories"] },
  { model: "magasin", candidates: ["magasins"] },
  { model: "product", candidates: ["products"] },
  { model: "review", candidates: ["reviews"] },
  { model: "order", candidates: ["orders"] },
  { model: "facture", candidates: ["factures"] },
  { model: "factureCounter", candidates: ["facture_counters"] },
  { model: "postCategorie", candidates: ["postcategories"] },
  { model: "postSubCategorie", candidates: ["postsubcategories"] },
  { model: "post", candidates: ["posts"] },
  { model: "postComment", candidates: ["postcomments"] },
  { model: "companyData", candidates: ["companydatas", "companydata"] },
  { model: "contactInfo", candidates: ["contactinfos", "contactinfo"] },
  { model: "homePageData", candidates: ["homepagedatas", "homepagedata"] },
  { model: "specialPageBanner", candidates: ["specialpagebanners"] },
  { model: "websiteTitres", candidates: ["websitetitres"] },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toJsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => toJsonSafe(v));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toJsonSafe(v);
    return out;
  }
  return value;
}

function toDateOrNow(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required for mongo-to-mysql import.");
  }

  const mongo = new MongoClient(mongoUri);
  await mongo.connect();

  const dbName = process.env.MONGODB_DB_NAME || mongo.options.dbName;
  if (!dbName) {
    throw new Error("Could not determine Mongo DB name. Set MONGODB_DB_NAME.");
  }

  const db = mongo.db(dbName);
  const existingCollections = new Set((await db.listCollections().toArray()).map((c) => c.name));

  let totalImported = 0;

  for (const target of IMPORT_TARGETS) {
    const collectionName =
      target.candidates.find((name) => existingCollections.has(name)) ?? target.candidates[0];
    const collection = db.collection(collectionName);

    const docs = await collection.find({}).toArray();
    if (!docs.length) {
      console.log(`[mongo-to-mysql] skip ${collectionName} (empty or missing)`);
      continue;
    }

    const delegate = (prisma as any)[target.model];
    if (!delegate) {
      console.warn(`[mongo-to-mysql] missing Prisma delegate: ${String(target.model)}`);
      continue;
    }

    for (const raw of docs) {
      const id = raw._id ? String(raw._id) : "";
      if (!id) continue;

      const { _id, createdAt, updatedAt, ...rest } = raw as any;
      await delegate.upsert({
        where: { id },
        update: {
          data: toJsonSafe(rest),
          createdAt: toDateOrNow(createdAt),
          updatedAt: toDateOrNow(updatedAt),
        },
        create: {
          id,
          data: toJsonSafe(rest),
          createdAt: toDateOrNow(createdAt),
          updatedAt: toDateOrNow(updatedAt),
        },
      });
      totalImported += 1;
    }

    console.log(`[mongo-to-mysql] imported ${docs.length} docs from ${collectionName}`);
  }

  await mongo.close();
  await prisma.$disconnect();
  console.log(`[mongo-to-mysql] done, imported ${totalImported} documents.`);
}

main().catch(async (err) => {
  console.error("[mongo-to-mysql] failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
