import crypto from "crypto";

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

export function generateRef(prefix: string, mode: "lower" | "upper" = "lower"): string {
  const raw = crypto.randomBytes(3).toString("hex");
  return `${prefix}${mode === "upper" ? raw.toUpperCase() : raw.toLowerCase()}`;
}
