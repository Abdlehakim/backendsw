// src/routes/dashboardadmin/factures/createFacture.ts
import express, { Request, Response } from "express";
import Facture from "@/models/Facture";
import Order from "@/models/Order";
import { requirePermission } from "@/middleware/requireDashboardPermission";
 /////api/dashboardadmin/factures/createFacture
const router = express.Router();

router.post("/createFacture", requirePermission("M_Access"), async (req: Request, res: Response) => {
  try {
    const facture = await Facture.create(req.body);
    await Order.updateOne({ _id: facture.order }, { $set: { Invoice: true } });
    return res.status(201).json({ facture });
  } catch (err) {
    console.error("Create Facture Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
