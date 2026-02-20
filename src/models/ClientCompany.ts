import { createCompatModel } from "@/db/mongooseCompat";

export interface IClientCompany {
  _id: string;
  companyName: string;
  contactName?: string;
  phone: string;
  email?: string;
  vatNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ClientCompany = createCompatModel({
  modelName: "ClientCompany",
  delegate: "clientCompany",
  collectionName: "clientcompanies",
  beforeSave: (doc) => {
    if (typeof doc.email === "string") {
      doc.email = doc.email.toLowerCase().trim();
    }
  },
});

export default ClientCompany;
