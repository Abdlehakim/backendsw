import { createCompatModel } from "@/db/mongooseCompat";

export interface IContactInfo {
  _id: string;
  name: string;
  email: string;
  phone: number;
  address: string;
  city: string;
  zipcode: string;
  governorate: string;
  facebook: string;
  linkedin: string;
  instagram: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ContactInfo = createCompatModel({
  modelName: "ContactInfo",
  delegate: "contactInfo",
  collectionName: "contactinfo",
  uniqueFields: ["email", "phone"],
  beforeSave: (doc) => {
    if (typeof doc.email === "string") doc.email = doc.email.toLowerCase().trim();
  },
});

export default ContactInfo;
