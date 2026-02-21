// src/routes/dashboardadmin/orders/getAllOrders.ts
import express, { Request, Response } from "express";
import Order from "@/models/Order";
import prisma from "@/db/prisma";
import { requirePermission } from "@/middleware/requireDashboardPermission";

const router = express.Router();

function rowToDoc(row: any) {
  const data = row?.data ?? {};
  return {
    _id: String(row.id),
    ...data,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function extractId(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v._id ?? v.id ?? "");
  return null;
}

/**
 * GET /api/dashboardadmin/orders
 */
router.get("/", requirePermission("M_Access"), async (_req: Request, res: Response): Promise<void> => {
  try {
    const orders: any[] = await Order.find().sort({ createdAt: -1 }).lean();

    const clientIds = Array.from(
      new Set(
        orders
          .map((o) => extractId(o.client))
          .filter((id): id is string => !!id && id.length > 0)
      )
    );

    if (clientIds.length) {
      const clientRows = await prisma.client.findMany({
        where: { id: { in: clientIds } },
      });

      const clientMap = new Map<string, any>();
      for (const row of clientRows) clientMap.set(String(row.id), rowToDoc(row));

      for (const o of orders) {
        const cid = extractId(o.client);
        if (cid && clientMap.has(cid)) o.client = clientMap.get(cid);
      }
    }

    res.status(200).json({ orders });
  } catch (error) {
    console.error("Get Orders Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;