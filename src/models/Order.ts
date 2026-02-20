import crypto from "crypto";
import { createCompatModel, utils } from "@/db/mongooseCompat";
import { IClient } from "@/models/Client";
import { IClientShop } from "@/models/ClientShop";
import { IClientCompany } from "@/models/ClientCompany";
import type { IFacture } from "@/models/Facture";

export type OrderStatus =
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Refunded"
  | "Pickup";

export interface IOrderItemAttribute {
  attribute: string;
  name: string;
  value: string;
}

export interface IOrderItem {
  product: string;
  reference: string;
  name: string;
  tva: number;
  quantity: number;
  mainImageUrl?: string;
  discount: number;
  price: number;
  attributes?: IOrderItemAttribute[];
}

export interface IDeliveryAddress {
  AddressID: string;
  DeliverToAddress: string;
}

export interface IPickupMagasin {
  MagasinID: string;
  MagasinName: string;
  MagasinAddress: string;
}

export interface IPaymentMethod {
  PaymentMethodID: string;
  PaymentMethodLabel: string;
}

export interface IDeliveryMethod {
  deliveryMethodID: string;
  deliveryMethodName: string;
  Cost: string;
  expectedDeliveryDate?: Date | string;
}

export interface IOrder {
  _id: string;
  ref?: string;
  client: string | IClient | IClientShop | IClientCompany;
  clientName: string;
  DeliveryAddress: IDeliveryAddress[];
  pickupMagasin: IPickupMagasin[];
  paymentMethod: IPaymentMethod[];
  orderItems: IOrderItem[];
  deliveryMethod: IDeliveryMethod[];
  orderStatus: OrderStatus;
  Invoice: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

function parseNumberLike(n?: string | number) {
  if (typeof n === "number") return n;
  if (!n) return 0;
  const x = parseFloat(String(n).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

function projectOrderToFacturePatch(order: IOrder): {
  set: Partial<IFacture>;
  items: IFacture["items"];
} {
  const addr = Array.isArray(order.DeliveryAddress) ? order.DeliveryAddress[0] : undefined;
  const mag = Array.isArray(order.pickupMagasin) ? order.pickupMagasin[0] : undefined;
  const pay = Array.isArray(order.paymentMethod) ? order.paymentMethod[0] : undefined;
  const del = Array.isArray(order.deliveryMethod) ? order.deliveryMethod[0] : undefined;

  const deliveryAddress = addr
    ? {
        AddressID: String(addr.AddressID),
        DeliverToAddress: addr.DeliverToAddress ?? "",
      }
    : undefined;

  const pickupMagasin = mag
    ? {
        MagasinID: String(mag.MagasinID),
        MagasinAddress: mag.MagasinAddress ?? "",
        MagasinName: mag.MagasinName ?? undefined,
      }
    : undefined;

  const paymentMethod = pay
    ? {
        PaymentMethodID: String(pay.PaymentMethodID),
        PaymentMethodLabel: pay.PaymentMethodLabel ?? "",
      }
    : undefined;

  const deliveryMethod = del
    ? {
        deliveryMethodID: String(del.deliveryMethodID),
        deliveryMethodName: del.deliveryMethodName ?? undefined,
        Cost: del.Cost ?? "0",
        expectedDeliveryDate: del.expectedDeliveryDate
          ? new Date(del.expectedDeliveryDate)
          : undefined,
      }
    : undefined;

  const items = (order.orderItems ?? []).map((it) => ({
    product: String(it.product),
    reference: it.reference ?? "",
    name: it.name ?? "",
    tva: Number(it.tva ?? 0),
    quantity: Number(it.quantity ?? 1),
    discount: Number(it.discount ?? 0),
    price: Number(it.price ?? 0),
    attributes: (it.attributes ?? []).map((a) => ({
      attribute: String(a.attribute),
      name: a.name ?? "",
      value: a.value ?? "",
    })),
  })) as IFacture["items"];

  const shippingCost = parseNumberLike(deliveryMethod?.Cost);
  let subtotalHT = 0;
  let tvaTotal = 0;
  for (const li of items) {
    const unitNet = Math.max(0, li.price - (li.discount ?? 0));
    const lineNet = unitNet * li.quantity;
    const lineTVA = (lineNet * (li.tva ?? 0)) / 100;
    subtotalHT += lineNet;
    tvaTotal += lineTVA;
  }
  const grandTotalTTC = subtotalHT + tvaTotal + shippingCost;

  const set: Partial<IFacture> = {
    orderRef: order.ref ?? undefined,
    client: String((order as any).client?._id ?? order.client),
    clientName: order.clientName ?? "",
    deliveryAddress,
    pickupMagasin,
    paymentMethod,
    deliveryMethod,
    shippingCost,
    subtotalHT,
    tvaTotal,
    grandTotalTTC,
  };

  return { set, items };
}

const Order = createCompatModel({
  modelName: "Order",
  delegate: "order",
  collectionName: "orders",
  defaults: {
    DeliveryAddress: [],
    pickupMagasin: [],
    paymentMethod: [],
    orderItems: [],
    deliveryMethod: [],
    orderStatus: "Processing",
    Invoice: false,
  },
  relations: {
    client: {
      resolver: async (value) => {
        const id = String((value as any)?._id ?? value);
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
    "DeliveryAddress.AddressID": { model: "Address" },
    "pickupMagasin.MagasinID": { model: "Magasin" },
    "paymentMethod.PaymentMethodID": { model: "PaymentMethod" },
    "deliveryMethod.deliveryMethodID": { model: "DeliveryOption" },
  },
  beforeSave: (doc) => {
    if (!doc.ref) {
      doc.ref = `ORDER-${crypto.randomBytes(4).toString("hex")}`;
    }
    doc.DeliveryAddress = utils.normalizeValue(doc.DeliveryAddress ?? []);
    doc.pickupMagasin = utils.normalizeValue(doc.pickupMagasin ?? []);
    doc.paymentMethod = utils.normalizeValue(doc.paymentMethod ?? []);
    doc.orderItems = utils.normalizeValue(doc.orderItems ?? []);
    doc.deliveryMethod = utils.normalizeValue(doc.deliveryMethod ?? []);
  },
  afterSave: async (doc) => {
    if (!doc.Invoice) return;
    const { default: Facture } = await import("@/models/Facture");
    const facture = await (Facture as any).findOne({ order: String(doc._id) });
    if (!facture || facture.status === "Cancelled") return;
    const { set, items } = projectOrderToFacturePatch(doc as IOrder);
    facture.set(set);
    facture.set("items", items);
    facture.markModified("items");
    await facture.save();
  },
});

export default Order;
