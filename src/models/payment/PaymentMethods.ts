import { createCompatModel } from "@/db/mongooseCompat";
import { PAYMENT_METHOD_KEYS, PaymentMethodKey } from "@/constants/paymentMethodsData";

export interface IPaymentMethod {
  _id: string;
  name: PaymentMethodKey;
  enabled: boolean;
  label?: string;
  help?: string;
  payOnline: boolean;
  requireAddress: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentMethod = createCompatModel({
  modelName: "PaymentMethod",
  delegate: "paymentMethod",
  collectionName: "paymentmethods",
  uniqueFields: ["name"],
  defaults: {
    enabled: false,
    label: "",
    help: "",
    payOnline: false,
    requireAddress: false,
  },
  beforeSave: (doc) => {
    if (doc.name && !PAYMENT_METHOD_KEYS.includes(doc.name)) {
      throw new Error("Invalid payment method key.");
    }
  },
});

export default PaymentMethod;
