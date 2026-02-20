import { createCompatModel } from "@/db/mongooseCompat";

export interface IDashboardRole {
  _id: string;
  name: string;
  description?: string;
  permissions?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const DashboardRole = createCompatModel({
  modelName: "DashboardRole",
  delegate: "dashboardRole",
  collectionName: "dashboardroles",
  uniqueFields: ["name"],
  defaults: {
    permissions: [],
  },
});

export default DashboardRole;
