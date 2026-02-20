import { createCompatModel } from "@/db/mongooseCompat";

export interface IPostComment {
  _id: string;
  post: string;
  author: string;
  authorModel: "Client" | "DashboardUser";
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PostComment = createCompatModel({
  modelName: "PostComment",
  delegate: "postComment",
  collectionName: "postcomments",
  relations: {
    post: { model: "Post" },
    author: {
      resolver: async (value, parent) => {
        const id = String((value as any)?._id ?? value);
        if (parent?.authorModel === "DashboardUser") {
          const { default: DashboardUser } = await import("@/models/dashboardadmin/DashboardUser");
          return (DashboardUser as any).findById(id).lean();
        }
        const { default: Client } = await import("@/models/Client");
        return (Client as any).findById(id).lean();
      },
    },
  },
});

export default PostComment;
