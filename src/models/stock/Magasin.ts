import { createCompatModel, utils } from "@/db/mongooseCompat";
import { generateRef, slugify } from "@/models/_helpers";

export interface IMagasin {
  _id: string;
  name: string;
  slug: string;
  reference: string;
  image: string;
  imageId: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  vadmin: string;
  localisation?: string;
  openingHours: Record<string, Array<{ open: string; close: string }>>;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const Magasin = createCompatModel({
  modelName: "Magasin",
  delegate: "magasin",
  collectionName: "magasins",
  uniqueFields: ["reference"],
  defaults: {
    vadmin: "not-approve",
    openingHours: {},
  },
  relations: {
    createdBy: { model: "DashboardUser" },
    updatedBy: { model: "DashboardUser" },
  },
  beforeSave: (doc) => {
    if (!doc.reference) doc.reference = generateRef("bo", "lower");
    if (doc.name) doc.slug = slugify(String(doc.name));
    doc.openingHours = utils.normalizeValue(doc.openingHours ?? {});
  },
});

export default Magasin;
