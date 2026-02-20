import { createCompatModel } from "@/db/mongooseCompat";

export interface IhomePageData {
  _id: string;
  HPbannerImgUrl: string;
  HPbannerImgId: string;
  HPbannerTitle: string;
  HPcategorieTitle: string;
  HPcategorieSubTitle: string;
  HPbrandTitle: string;
  HPbrandSubTitle: string;
  HPmagasinTitle: string;
  HPmagasinSubTitle: string;
  HPNewProductTitle: string;
  HPNewProductSubTitle: string;
  HPPromotionTitle: string;
  HPPromotionSubTitle: string;
  HPBestCollectionTitle: string;
  HPBestCollectionSubTitle: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const HomePageData = createCompatModel({
  modelName: "HomePageData",
  delegate: "homePageData",
  collectionName: "homepagedata",
  uniqueFields: [
    "HPbannerImgUrl",
    "HPbannerImgId",
    "HPbannerTitle",
    "HPcategorieTitle",
    "HPcategorieSubTitle",
    "HPbrandTitle",
    "HPbrandSubTitle",
    "HPmagasinTitle",
    "HPmagasinSubTitle",
    "HPNewProductTitle",
    "HPNewProductSubTitle",
    "HPPromotionTitle",
    "HPPromotionSubTitle",
    "HPBestCollectionTitle",
    "HPBestCollectionSubTitle",
  ],
});

export default HomePageData;
