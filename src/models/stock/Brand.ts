import { createCompatModel } from "@/db/mongooseCompat";
import { generateRef, slugify } from "@/models/_helpers";

export interface IBrand {
  _id: string;
  reference: string;
  name: string;
  slug: string;
  place?: string;
  description?: string | null;
  imageUrl?: string | null;
  imageId?: string | null;
  logoUrl?: string | null;
  logoId?: string | null;
  vadmin: string;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const Brand = createCompatModel({
  modelName: "Brand",
  delegate: "brand",
  collectionName: "brands",
  uniqueFields: ["name", "reference", "slug"],
  defaults: {
    vadmin: "not-approve",
    description: null,
    imageUrl: null,
    imageId: null,
    logoUrl: null,
    logoId: null,
  },
  relations: {
    createdBy: { model: "DashboardUser" },
    updatedBy: { model: "DashboardUser" },
  },
  beforeSave: (doc) => {
    if (!doc.reference) doc.reference = generateRef("br", "lower");
    if (doc.name) doc.slug = slugify(String(doc.name));
  },
});

export default Brand;
