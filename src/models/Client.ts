import { createCompatModel, utils } from "@/db/mongooseCompat";

export interface IClient {
  _id: string;
  username?: string;
  phone?: string;
  email: string;
  password?: string;
  isGoogleAccount?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const Client = createCompatModel({
  modelName: "Client",
  delegate: "client",
  collectionName: "clients",
  defaults: {
    isGoogleAccount: false,
  },
  uniqueFields: ["email"],
  beforeSave: async (doc, ctx) => {
    if (typeof doc.email === "string") {
      doc.email = doc.email.toLowerCase().trim();
    }
    if (doc.password) {
      const changed = !ctx.previous || doc.password !== ctx.previous.password;
      const alreadyHashed = /^\$2[aby]\$\d{2}\$/.test(doc.password);
      if (changed && !alreadyHashed) {
        const salt = await utils.bcrypt.genSalt(10);
        doc.password = await utils.bcrypt.hash(doc.password, salt);
      }
    }
  },
  methods: {
    async comparePassword(this: IClient, candidatePassword: string) {
      if (!this.password) return false;
      return utils.bcrypt.compare(candidatePassword, this.password);
    },
  },
});

export default Client;
