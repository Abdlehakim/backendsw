import { createCompatModel } from "@/db/mongooseCompat";
import { generateRef, slugify } from "@/models/_helpers";

export interface IPostCategorie {
  _id: string;
  reference: string;
  name: string;
  slug: string;
  iconUrl: string;
  iconId: string;
  imageUrl: string;
  imageId: string;
  bannerUrl: string;
  bannerId: string;
  vadmin: "not-approve" | "approve";
  subCategorieCount?: number;
  postCount?: number;
  createdBy: string;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const PostCategorie = createCompatModel({
  modelName: "PostCategorie",
  delegate: "postCategorie",
  collectionName: "postcategories",
  uniqueFields: ["reference", "name", "slug"],
  defaults: {
    vadmin: "not-approve",
    updatedBy: null,
  },
  relations: {
    createdBy: { model: "DashboardUser" },
    updatedBy: { model: "DashboardUser" },
    subCategorieCount: {
      model: "PostSubCategorie",
      count: true,
      localField: "_id",
      foreignField: "postCategorie",
    },
    postCount: {
      model: "Post",
      count: true,
      localField: "_id",
      foreignField: "postCategorie",
    },
  },
  beforeSave: (doc) => {
    if (!doc.reference) doc.reference = generateRef("pc", "upper");
    if (doc.name) doc.slug = slugify(String(doc.name));
  },
});

export default PostCategorie;
