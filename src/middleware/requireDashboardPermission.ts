// src/middleware/requireDashboardPermission.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import DashboardUser from "@/models/dashboardadmin/DashboardUser";
import DashboardRole from "@/models/dashboardadmin/DashboardRole";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET environment variable");
const JWT_SECRET_SAFE: string = JWT_SECRET;

export interface JwtPayload {
  id: string;
  email?: string;
  iat: number;
  exp: number;
}

declare module "express-serve-static-core" {
  interface Request {
    dashboardUser?: any;
    dashboardRole?: any;
  }
}

function extractId(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v._id ?? v.id ?? "");
  return null;
}

function normalizePerm(p: any): string | null {
  if (!p) return null;
  if (typeof p === "string") return p;
  return extractId(p);
}

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.token_FrontEndAdmin;
      if (!token) {
        res.status(401).json({ message: "Unauthenticated." });
        return;
      }

      let decoded: JwtPayload;
      try {
        decoded = jwt.verify(token, JWT_SECRET_SAFE) as unknown as JwtPayload;
      } catch {
        res.status(401).json({ message: "Invalid or expired token." });
        return;
      }

      const user: any = await DashboardUser.findById(decoded.id).select("-password").lean();
      if (!user) {
        res.status(401).json({ message: "User not found." });
        return;
      }

      const roleId = extractId(user.role);
      if (!roleId) {
        res.status(403).json({ message: "Forbidden." });
        return;
      }

      const role: any = await DashboardRole.findById(roleId).select("name permissions").lean();

      const permsRaw =
        (role && Array.isArray(role.permissions) && role.permissions) ||
        (role?.data && Array.isArray(role.data.permissions) && role.data.permissions) ||
        [];

      const perms = new Set(permsRaw.map(normalizePerm).filter(Boolean) as string[]);
      if (!perms.has(permission)) {
        res.status(403).json({ message: "Forbidden." });
        return;
      }

      req.dashboardUser = user;
      req.dashboardRole = role;

      next();
    } catch (err) {
      console.error("requirePermission error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  };
}