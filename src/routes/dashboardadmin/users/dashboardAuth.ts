import { Router, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import DashboardUser from "@/models/dashboardadmin/DashboardUser";
import DashboardRole from "@/models/dashboardadmin/DashboardRole";
import { issueToken, setSessionCookies, clearSessionCookies, REFRESH_THRESHOLD_MS } from "./session";

const router = Router();

function setNoStore(res: Response) {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    Vary: "Cookie",
  });
}

function extractId(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v._id ?? v.id ?? "");
  return null;
}

const getMe: RequestHandler = async (req, res) => {
  try {
    setNoStore(res);

    const token = req.cookies?.token_FrontEndAdmin;
    if (!token) return void res.status(200).json({ user: null });

    let decoded: { id: string; exp: number };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; exp: number };
    } catch {
      clearSessionCookies(res);
      return void res.status(200).json({ user: null });
    }

    const user: any = await DashboardUser.findById(decoded.id).select("-password").lean();

    if (!user) {
      clearSessionCookies(res);
      return void res.status(200).json({ user: null });
    }

    const roleId = extractId(user.role);
    if (roleId) {
      const role: any = await DashboardRole.findById(roleId).select("name permissions").lean();
      if (role) user.role = role;
    }

    const remainingMs = decoded.exp * 1000 - Date.now();
    if (remainingMs <= REFRESH_THRESHOLD_MS) {
      const newToken = issueToken(String(user._id ?? decoded.id));
      setSessionCookies(res, newToken);
    } else {
      setSessionCookies(res, token);
    }

    return void res.status(200).json({ user });
  } catch (err) {
    console.error("Dashboard auth error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
};

const logout: RequestHandler = (req, res) => {
  setNoStore(res);

  const v = (req.body && (req.body as any).confirm) ?? req.query.confirm;
  const confirm = v === true || v === "true" || v === "1" || v === 1;

  if (!confirm) {
    return void res.status(400).json({ message: "Missing confirm flag" });
  }

  clearSessionCookies(res);
  return void res.status(200).json({ message: "Logged out successfully" });
};

router.get("/me", getMe);
router.post("/logout", logout);

export default router;