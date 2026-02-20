import { createCompatModel } from "@/db/mongooseCompat";

export interface ISpecialPageBanner {
  _id: string;
  BCbannerImgUrl: string;
  BCbannerImgId: string;
  BCbannerTitle: string;
  PromotionBannerImgUrl: string;
  PromotionBannerImgId: string;
  PromotionBannerTitle: string;
  NPBannerImgUrl: string;
  NPBannerImgId: string;
  NPBannerTitle: string;
  BlogBannerImgUrl: string;
  BlogBannerImgId: string;
  BlogBannerTitle: string;
  ContactBannerImgUrl: string;
  ContactBannerImgId: string;
  ContactBannerTitle: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const SpecialPageBanner = createCompatModel({
  modelName: "SpecialPageBanner",
  delegate: "specialPageBanner",
  collectionName: "specialpagebanners",
  uniqueFields: [
    "BCbannerImgUrl",
    "BCbannerImgId",
    "BCbannerTitle",
    "PromotionBannerImgUrl",
    "PromotionBannerImgId",
    "PromotionBannerTitle",
    "NPBannerImgUrl",
    "NPBannerImgId",
    "NPBannerTitle",
    "BlogBannerImgUrl",
    "BlogBannerImgId",
    "BlogBannerTitle",
    "ContactBannerImgUrl",
    "ContactBannerImgId",
    "ContactBannerTitle",
  ],
});

export default SpecialPageBanner;
