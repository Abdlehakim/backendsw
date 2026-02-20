import { createCompatModel, utils } from "@/db/mongooseCompat";

export interface IFactureItemAttribute {
  attribute: string;
  name: string;
  value: string;
}

export interface IFactureItem {
  product: string;
  reference: string;
  name: string;
  tva: number;
  quantity: number;
  discount: number;
  price: number;
  attributes?: IFactureItemAttribute[];
}

export interface IFacturePaymentMethod {
  PaymentMethodID: string;
  PaymentMethodLabel: string;
}

export interface IFactureDeliveryMethod {
  deliveryMethodID: string;
  deliveryMethodName?: string;
  Cost: string;
  expectedDeliveryDate?: Date | string;
}

export interface IFactureDeliveryAddress {
  AddressID: string;
  DeliverToAddress: string;
}

export interface IFacturePickupMagasin {
  MagasinID: string;
  MagasinName?: string;
  MagasinAddress: string;
}

export interface IFacture {
  _id: string;
  ref: string;
  seq: number;
  year: number;
  order: string;
  orderRef?: string;
  client: string;
  clientName: string;
  deliveryAddress?: IFactureDeliveryAddress;
  pickupMagasin?: IFacturePickupMagasin;
  paymentMethod?: IFacturePaymentMethod;
  deliveryMethod?: IFactureDeliveryMethod;
  items: IFactureItem[];
  currency: "TND" | "EUR" | "USD" | string;
  subtotalHT: number;
  tvaTotal: number;
  shippingCost: number;
  grandTotalTTC: number;
  status: "Paid" | "Cancelled";
  issuedAt: Date | string;
  paidAt?: Date | string;
  cancelledAt?: Date | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFactureCounter {
  _id: string;
  year: number;
  seq: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const FactureCounter = createCompatModel({
  modelName: "FactureCounter",
  delegate: "factureCounter",
  collectionName: "facture_counters",
  uniqueFields: ["year"],
  defaults: {
    seq: 0,
  },
});

const Facture = createCompatModel({
  modelName: "Facture",
  delegate: "facture",
  collectionName: "factures",
  uniqueFields: ["ref", "order"],
  defaults: {
    currency: "TND",
    status: "Paid",
    items: [],
  },
  beforeSave: async (doc) => {
    doc.items = utils.normalizeValue(doc.items ?? []);
    if (!doc.issuedAt) doc.issuedAt = new Date();

    if (!doc.ref || !doc.seq || !doc.year) {
      const year = new Date(doc.issuedAt).getFullYear();
      const counter = await (FactureCounter as any).findOneAndUpdate(
        { year },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      ).lean();
      const seq = Number(counter?.seq ?? 1);
      doc.year = year;
      doc.seq = seq;
      doc.ref = `FC-${seq}-${year}`;
    }

    const sameYearSeq = await (Facture as any).findOne({
      year: doc.year,
      seq: doc.seq,
      _id: { $ne: doc._id },
    }).lean();
    if (sameYearSeq) {
      const err: any = new Error("Duplicate facture sequence for year.");
      err.code = 11000;
      throw err;
    }
  },
  afterSave: async (doc) => {
    const { default: Order } = await import("@/models/Order");
    await (Order as any).updateOne({ _id: String(doc.order) }, { $set: { Invoice: true } });
  },
  afterDelete: async (doc) => {
    const { default: Order } = await import("@/models/Order");
    await (Order as any).updateOne({ _id: String(doc.order) }, { $set: { Invoice: false } });
  },
});

export default Facture;
