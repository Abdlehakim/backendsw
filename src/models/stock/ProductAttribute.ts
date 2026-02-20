import { createCompatModel } from "@/db/mongooseCompat";

export type AttributeType = "dimension" | "color" | "other type";

export interface IProductAttribute {
  _id: string;
  name: string;
  type: AttributeType | AttributeType[];
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ALLOWED: AttributeType[] = ["dimension", "color", "other type"];

const ProductAttribute = createCompatModel({
  modelName: "ProductAttribute",
  delegate: "productAttribute",
  collectionName: "productattributes",
  uniqueFields: ["name"],
  relations: {
    createdBy: { model: "DashboardUser" },
    updatedBy: { model: "DashboardUser" },
  },
  beforeSave: (doc) => {
    const values = Array.isArray(doc.type) ? doc.type : [doc.type];
    const normalized = values.map((v: string) => String(v).trim());
    if (!normalized.length || normalized.some((v: string) => !ALLOWED.includes(v as AttributeType))) {
      throw new Error("Type must include at least one of 'dimension', 'color', or 'other type'.");
    }
    doc.type = normalized;
  },
});

export default ProductAttribute;
