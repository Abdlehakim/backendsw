import { createCompatModel } from "@/db/mongooseCompat";

export interface ICompanyData {
  _id: string;
  name: string;
  bannerImageUrl: string;
  bannerImageId: string;
  logoImageUrl: string;
  logoImageId: string;
  contactBannerUrl?: string;
  contactBannerId?: string;
  description: string;
  email: string;
  phone: string;
  vat: string;
  address: string;
  city: string;
  zipcode: string;
  governorate: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CompanyData = createCompatModel({
  modelName: "CompanyData",
  delegate: "companyData",
  collectionName: "companydata",
  beforeSave: async (_doc, ctx) => {
    if (!ctx.isNew) return;
    const existing = await (CompanyData as any).countDocuments({});
    if (existing > 0) {
      throw new Error("CompanyData already exists. Use update instead.");
    }
  },
});

export default CompanyData;
