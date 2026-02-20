import { ObjectId } from "mongodb";

export { ObjectId };

export function isValidObjectId(value: unknown): value is string {
  return typeof value === "string" && ObjectId.isValid(value);
}

export function isObjectIdOrHexString(value: unknown): boolean {
  if (value instanceof ObjectId) return true;
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

export function normalizeObjectId(value: unknown): string | undefined {
  if (value instanceof ObjectId) return value.toString();
  if (typeof value === "string" && ObjectId.isValid(value)) return value;
  if (value && typeof value === "object") {
    const candidate = (value as any)._id ?? (value as any).id;
    if (candidate instanceof ObjectId) return candidate.toString();
    if (typeof candidate === "string" && ObjectId.isValid(candidate)) return candidate;
  }
  return undefined;
}
