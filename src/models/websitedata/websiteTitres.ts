import { createCompatModel } from "@/db/mongooseCompat";

export interface IwebsiteTitres {
  _id: string;
  SimilarProductTitre: string;
  SimilarProductSubTitre: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const WebsiteTitres = createCompatModel({
  modelName: "WebsiteTitres",
  delegate: "websiteTitres",
  collectionName: "websitetitres",
  uniqueFields: ["SimilarProductTitre", "SimilarProductSubTitre"],
});

export default WebsiteTitres;
