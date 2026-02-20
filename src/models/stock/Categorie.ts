import { createCompatModel } from "@/db/mongooseCompat";
import { generateRef, slugify } from "@/models/_helpers";

export interface ICategorie {
  _id: string;
  reference: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
  iconId?: string | null;
  imageUrl?: string | null;
  imageId?: string | null;
  bannerUrl?: string | null;
  bannerId?: string | null;
  vadmin: "approve" | "not-approve";
  subCategorieCount?: number;
  productCount?: number;
  createdBy: string;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const Categorie = createCompatModel({
  modelName: "Categorie",
  delegate: "categorie",
  collectionName: "categories",
  uniqueFields: ["reference", "name", "slug"],
  defaults: {
    iconUrl: null,
    iconId: null,
    imageUrl: null,
    imageId: null,
    bannerUrl: null,
    bannerId: null,
    vadmin: "not-approve",
    updatedBy: null,
  },
  relations: {
    createdBy: { model: "DashboardUser" },
    updatedBy: { model: "DashboardUser" },
    subCategorieCount: {
      model: "SubCategorie",
      count: true,
      localField: "_id",
      foreignField: "categorie",
    },
    productCount: {
      model: "Product",
      count: true,
      localField: "_id",
      foreignField: "categorie",
    },
  },
  beforeSave: (doc) => {
    if (!doc.reference) doc.reference = generateRef("ca", "upper");
    if (doc.name) doc.slug = slugify(String(doc.name));
  },
});

export default Categorie;
