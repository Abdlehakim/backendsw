import { createCompatModel } from "@/db/mongooseCompat";

export interface IDeliveryOption {
  _id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays: number;
  isActive: boolean;
  isPickup: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const DeliveryOption = createCompatModel({
  modelName: "DeliveryOption",
  delegate: "deliveryOption",
  collectionName: "deliveryoptions",
  uniqueFields: ["name"],
  defaults: {
    isActive: true,
    isPickup: false,
  },
  relations: {
    createdBy: { model: "DashboardUser" },
    updatedBy: { model: "DashboardUser" },
  },
});

export default DeliveryOption;
