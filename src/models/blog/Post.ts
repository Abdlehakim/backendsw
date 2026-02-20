import { createCompatModel, utils } from "@/db/mongooseCompat";
import { generateRef, slugify } from "@/models/_helpers";

export interface IPostSubsection {
  title: string;
  description: string;
  imageUrl?: string;
  imageId?: string;
  children: IPostSubsection[];
}

export interface IPost {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageId: string;
  reference: string;
  slug: string;
  vadmin: "not-approve" | "approve";
  postCategorie: string;
  postSubCategorie?: string | null;
  author: string;
  subsections: IPostSubsection[];
  createdBy: string;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PostModel {
  commentCount(postId: string): Promise<number>;
}

const Post = createCompatModel({
  modelName: "Post",
  delegate: "post",
  collectionName: "posts",
  uniqueFields: ["title", "reference", "slug"],
  defaults: {
    vadmin: "not-approve",
    postSubCategorie: null,
    subsections: [],
    updatedBy: null,
  },
  relations: {
    postCategorie: { model: "PostCategorie" },
    postSubCategorie: { model: "PostSubCategorie" },
    author: { model: "DashboardUser" },
    createdBy: { model: "DashboardUser" },
    updatedBy: { model: "DashboardUser" },
  },
  beforeSave: (doc) => {
    if (!doc.reference) doc.reference = generateRef("ps", "lower");
    if (doc.title) doc.slug = slugify(String(doc.title));
    doc.subsections = utils.normalizeValue(doc.subsections ?? []);
  },
  statics: {
    async commentCount(postId: string) {
      const { default: PostComment } = await import("@/models/blog/PostComment");
      return (PostComment as any).countDocuments({ post: String(postId) });
    },
  },
});

export default Post;
