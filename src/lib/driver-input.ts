import type { DriverInput } from "@/lib/driver";

const LIMITS = {
  name: 120,
  phone: 40,
  email: 254,
  homeAddress: 300,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseDriverInput(
  value: unknown,
): { ok: true; input: DriverInput } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Driver details are missing." };
  }

  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const homeAddress =
    typeof body.homeAddress === "string" ? body.homeAddress.trim() : "";

  if (!name) return { ok: false, error: "Name is required." };
  if (name.length > LIMITS.name) {
    return { ok: false, error: "Name is too long." };
  }
  if (phone.length > LIMITS.phone) {
    return { ok: false, error: "Phone is too long." };
  }
  if (email.length > LIMITS.email) {
    return { ok: false, error: "Email is too long." };
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email." };
  }
  if (homeAddress.length > LIMITS.homeAddress) {
    return { ok: false, error: "Home address is too long." };
  }

  return { ok: true, input: { name, phone, email, homeAddress } };
}
