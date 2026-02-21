import { randomBytes } from "crypto";

const OBJECT_ID_HEX_RE = /^[a-f0-9]{24}$/i;

function toObjectIdHex(value: unknown): string | undefined {
  if (typeof value === "string") {
    return OBJECT_ID_HEX_RE.test(value) ? value : undefined;
  }

  if (!value || typeof value !== "object") return undefined;

  const toStringFn = (value as { toString?: unknown }).toString;
  if (typeof toStringFn !== "function") return undefined;

  const stringified = toStringFn.call(value);
  return typeof stringified === "string" && OBJECT_ID_HEX_RE.test(stringified)
    ? stringified
    : undefined;
}

export class ObjectId {
  private readonly value: string;

  constructor(value?: unknown) {
    if (value === undefined || value === null) {
      this.value = randomBytes(12).toString("hex");
      return;
    }

    const hex = toObjectIdHex(value);
    if (!hex) {
      throw new Error("Invalid ObjectId");
    }
    this.value = hex.toLowerCase();
  }

  static isValid(value: unknown): boolean {
    return Boolean(toObjectIdHex(value));
  }

  toHexString(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }

  valueOf(): string {
    return this.value;
  }
}

export function isValidObjectId(value: unknown): value is string {
  return typeof value === "string" && ObjectId.isValid(value);
}

export function isObjectIdOrHexString(value: unknown): boolean {
  return ObjectId.isValid(value);
}

export function normalizeObjectId(value: unknown): string | undefined {
  const direct = toObjectIdHex(value);
  if (direct) return direct;

  if (value && typeof value === "object") {
    const candidate = (value as any)._id ?? (value as any).id;
    const nested = toObjectIdHex(candidate);
    if (nested) return nested;
  }

  return undefined;
}
