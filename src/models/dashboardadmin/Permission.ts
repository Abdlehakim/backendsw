import { createCompatModel } from "@/db/mongooseCompat";

export interface IPermission {
  _id: string;
  key: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PermissionModel = createCompatModel({
  modelName: "Permission",
  delegate: "permission",
  collectionName: "permissions",
  uniqueFields: ["key"],
});

export default PermissionModel;
