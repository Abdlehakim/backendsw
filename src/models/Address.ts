import { createCompatModel } from "@/db/mongooseCompat";
import { IClient } from "@/models/Client";
import { IClientShop } from "@/models/ClientShop";
import { IClientCompany } from "@/models/ClientCompany";

export interface IAddress {
  _id: string;
  Name: string;
  StreetAddress: string;
  Country: string;
  Province?: string;
  City: string;
  PostalCode: string;
  Phone: string;
  client: string | IClient | IClientShop | IClientCompany;
  createdAt?: Date;
  updatedAt?: Date;
}

const Address = createCompatModel({
  modelName: "Address",
  delegate: "address",
  collectionName: "addresses",
  relations: {
    client: {
      resolver: async (value) => {
        const id = typeof value === "object" && value?._id ? String(value._id) : String(value);
        const { default: Client } = await import("@/models/Client");
        const { default: ClientShop } = await import("@/models/ClientShop");
        const { default: ClientCompany } = await import("@/models/ClientCompany");
        return (
          (await (Client as any).findById(id).lean()) ||
          (await (ClientShop as any).findById(id).lean()) ||
          (await (ClientCompany as any).findById(id).lean()) ||
          value
        );
      },
    },
  },
});

export default Address;
