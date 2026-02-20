import { createCompatModel } from "@/db/mongooseCompat";
import { generateRef, slugify } from "@/models/_helpers";

export interface IPostSubCategorie {
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
  postCategorie: string;
  postCount?: number;
  createdBy: string;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const PostSubCategorie = createCompatModel({
  modelName: "PostSubCategorie",
  delegate: "postSubCategorie",
  collectionName: "postsubcategories",
  uniqueFields: ["reference", "name", "slug"],
  defaults: {
    vadmin: "not-approve",
    updatedBy: null,
  },
  relations: {
    postCategorie: { model: "PostCategorie" },
    createdBy: { model: "DashboardUser" },
    updatedBy: { model: "DashboardUser" },
    postCount: {
      model: "Post",
      count: true,
      localField: "_id",
      foreignField: "postSubCategorie",
    },
  },
  beforeSave: (doc) => {
    if (!doc.reference) doc.reference = generateRef("psc", "upper");
    if (doc.name) doc.slug = slugify(String(doc.name));
  },
});

export default PostSubCategorie;
