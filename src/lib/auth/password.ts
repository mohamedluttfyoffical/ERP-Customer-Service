import { hash, compare } from "bcryptjs";

export const BCRYPT_COST = 12;

/** bcrypt silently truncates inputs beyond 72 bytes; enforce the real limit. */
export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password).length;
}

export async function hashPassword(password: string): Promise<string> {
  if (passwordByteLength(password) > 72) {
    throw new Error("Password exceeds bcrypt's 72-byte limit");
  }
  return hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}
