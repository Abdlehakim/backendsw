import { createCompatModel } from "@/db/mongooseCompat";
import { generateRef, slugify } from "@/models/_helpers";

export interface ISubCategorie {
  _id: string;
  reference: string;
  name: string;
  slug: string;
  iconUrl: string;
  iconId?: string | null;
  imageUrl: string;
  imageId?: string | null;
  bannerUrl: string;
  bannerId?: string | null;
  vadmin: string;
  productCount?: number;
  categorie: string;
  createdBy: string;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const SubCategorie = createCompatModel({
  modelName: "SubCategorie",
  delegate: "subCategorie",
  collectionName: "subcategories",
  uniqueFields: ["reference", "name", "slug"],
  defaults: {
    iconId: null,
    imageId: null,
    bannerId: null,
    vadmin: "not-approve",
  },
  relations: {
    categorie: { model: "Categorie" },
    createdBy: { model: "DashboardUser" },
    updatedBy: { model: "DashboardUser" },
    productCount: {
      model: "Product",
      count: true,
      localField: "_id",
      foreignField: "subcategorie",
    },
  },
  beforeSave: (doc) => {
    if (!doc.reference) doc.reference = generateRef("sc", "lower");
    if (doc.name) doc.slug = slugify(String(doc.name));
  },
});

export default SubCategorie;
