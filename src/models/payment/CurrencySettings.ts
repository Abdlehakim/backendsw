import { createCompatModel } from "@/db/mongooseCompat";

export interface ICurrencySettings {
  _id: string;
  primary: string;
  secondaries: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const CurrencySettings = createCompatModel({
  modelName: "CurrencySettings",
  delegate: "currencySettings",
  collectionName: "currencysettings",
  defaults: {
    primary: "TND",
    secondaries: [],
  },
  beforeSave: (doc) => {
    if (typeof doc.primary === "string") {
      doc.primary = doc.primary.toUpperCase();
    }
    const secondary = Array.isArray(doc.secondaries) ? doc.secondaries : [];
    doc.secondaries = Array.from(new Set(secondary.map((c) => String(c).toUpperCase())));

    if (doc.secondaries.includes(doc.primary)) {
      throw new Error("Primary currency must not appear in 'secondaries' array.");
    }
  },
});

export default CurrencySettings;
