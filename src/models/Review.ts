import { createCompatModel, utils } from "@/db/mongooseCompat";
import { IClient } from "@/models/Client";

export interface IReview {
  _id: string;
  product: string;
  rating: number;
  text?: string;
  email: string;
  name: string;
  reply?: string;
  likes: Array<IClient | string>;
  dislikes: Array<IClient | string>;
  createdAt?: Date;
  updatedAt?: Date;
}

const Review = createCompatModel({
  modelName: "Review",
  delegate: "review",
  collectionName: "reviews",
  defaults: {
    likes: [],
    dislikes: [],
  },
  relations: {
    likes: { model: "Client" },
    dislikes: { model: "Client" },
  },
  beforeSave: (doc) => {
    doc.likes = utils.normalizeValue(doc.likes ?? []);
    doc.dislikes = utils.normalizeValue(doc.dislikes ?? []);
  },
});

export default Review;
