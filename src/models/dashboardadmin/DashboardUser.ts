import { createCompatModel, utils } from "@/db/mongooseCompat";

export interface IDashboardUser {
  _id: string;
  username: string;
  phone: string;
  email: string;
  password: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const DashboardUser = createCompatModel({
  modelName: "DashboardUser",
  delegate: "dashboardUser",
  collectionName: "dashboardusers",
  uniqueFields: ["username", "phone", "email"],
  relations: {
    role: { model: "DashboardRole" },
  },
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

    if (!doc.role) return;
    const { default: DashboardRole } = await import("@/models/dashboardadmin/DashboardRole");
    const roleDoc = await (DashboardRole as any).findById(String(doc.role)).lean();
    if (roleDoc?.name !== "SuperAdmin") return;

    const all = await (DashboardUser as any).find({ role: String(doc.role) }).lean();
    const others = all.filter((u: any) => String(u._id) !== String(doc._id));
    if (others.length > 0) {
      throw new Error("Only one SuperAdmin user is allowed.");
    }
  },
  methods: {
    async comparePassword(this: IDashboardUser, candidatePassword: string) {
      return utils.bcrypt.compare(candidatePassword, this.password);
    },
  },
});

export default DashboardUser;
