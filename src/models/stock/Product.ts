import { createCompatModel, utils } from "@/db/mongooseCompat";
import { generateRef, slugify } from "@/models/_helpers";

export interface IProduct {
  _id: string;
  name: string;
  info: string;
  description?: string;
  reference: string;
  slug: string;
  categorie: string;
  subcategorie?: string | null;
  magasin?: string | null;
  brand?: string | null;
  stock: number;
  price: number;
  tva: number;
  discount: number;
  stockStatus: "in stock" | "out of stock";
  statuspage: "none" | "new-products" | "promotion" | "best-collection";
  vadmin: "not-approve" | "approve";
  mainImageUrl: string;
  mainImageId?: string | null;
  extraImagesUrl: string[];
  extraImagesId: string[];
  nbreview: number;
  averageRating: number;
  createdBy: string;
  updatedBy?: string | null;
  attributes: Array<{
    attributeSelected: string;
    value?:
      | string
      | Array<{
          name: string;
          value?: string;
          hex?: string;
          image?: string;
          imageId?: string;
        }>;
  }>;
  productDetails: Array<{
    name: string;
    description?: string;
    image?: string;
    imageId?: string;
  }>;
  reviewCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const Product = createCompatModel({
  modelName: "Product",
  delegate: "product",
  collectionName: "products",
  uniqueFields: ["name", "reference", "slug"],
  defaults: {
    tva: 0,
    discount: 0,
    stockStatus: "in stock",
    statuspage: "none",
    vadmin: "not-approve",
    mainImageId: null,
    extraImagesUrl: [],
    extraImagesId: [],
    nbreview: 0,
    averageRating: 0,
    updatedBy: null,
    attributes: [],
    productDetails: [],
  },
  relations: {
    categorie: { model: "Categorie" },
    subcategorie: { model: "SubCategorie" },
    magasin: { model: "Magasin" },
    brand: { model: "Brand" },
    createdBy: { model: "DashboardUser" },
    updatedBy: { model: "DashboardUser" },
    "attributes.attributeSelected": { model: "ProductAttribute" },
    reviewCount: {
      model: "Review",
      count: true,
      localField: "_id",
      foreignField: "product",
    },
  },
  beforeSave: (doc) => {
    if (!doc.reference) doc.reference = generateRef("pr", "lower");
    if (doc.name) doc.slug = slugify(String(doc.name));
    doc.extraImagesUrl = Array.isArray(doc.extraImagesUrl) ? doc.extraImagesUrl : [];
    doc.extraImagesId = Array.isArray(doc.extraImagesId) ? doc.extraImagesId : [];
    doc.attributes = utils.normalizeValue(doc.attributes ?? []);
    doc.productDetails = utils.normalizeValue(doc.productDetails ?? []);
  },
});

export default Product;
