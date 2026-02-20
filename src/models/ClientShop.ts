import { createCompatModel } from "@/db/mongooseCompat";

export interface IClientShop {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ClientShop = createCompatModel({
  modelName: "ClientShop",
  delegate: "clientShop",
  collectionName: "clientshops",
  beforeSave: (doc) => {
    if (typeof doc.email === "string") {
      doc.email = doc.email.toLowerCase().trim();
    }
  },
});

export default ClientShop;
