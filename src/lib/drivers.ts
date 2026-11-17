import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Driver, DriverInput } from "@/lib/driver";

type StoredDriver = Driver & {
  createdAt: string;
  updatedAt: string;
};

const filePath = path.join(process.cwd(), "data", "drivers.json");

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function toStoredDriver(value: unknown): StoredDriver | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    row.id.length === 0 ||
    typeof row.name !== "string" ||
    typeof row.phone !== "string" ||
    typeof row.homeAddress !== "string" ||
    typeof row.createdAt !== "string" ||
    typeof row.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: typeof row.email === "string" ? row.email : "",
    homeAddress: row.homeAddress,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function readDrivers(): StoredDriver[] {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(
      "Driver file is unreadable. Check data/drivers.json and try again.",
    );
  }

  const drivers = parsed.map(toStoredDriver);
  if (drivers.some((driver) => driver === null)) {
    throw new Error(
      "Driver file is unreadable. Check data/drivers.json and try again.",
    );
  }
  return drivers as StoredDriver[];
}

function writeDrivers(drivers: StoredDriver[]) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(drivers, null, 2)}\n`, "utf8");
  renameSync(tempPath, filePath);
}

function byName(a: Driver, b: Driver): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function listDrivers(): Driver[] {
  return readDrivers()
    .map(({ id, name, phone, email, homeAddress }) => ({
      id,
      name,
      phone,
      email,
      homeAddress,
    }))
    .sort(byName);
}

export function createDriver(input: DriverInput): Driver {
  const now = new Date().toISOString();
  const driver: StoredDriver = {
    id: crypto.randomUUID(),
    name: input.name,
    phone: input.phone,
    email: input.email,
    homeAddress: input.homeAddress,
    createdAt: now,
    updatedAt: now,
  };
  const drivers = readDrivers();
  drivers.push(driver);
  writeDrivers(drivers);
  return toPublicDriver(driver);
}

export function updateDriver(id: string, input: DriverInput): Driver | null {
  const drivers = readDrivers();
  const index = drivers.findIndex((driver) => driver.id === id);
  if (index === -1) return null;

  const current = drivers[index];
  const next: StoredDriver = {
    ...current,
    name: input.name,
    phone: input.phone,
    email: input.email,
    homeAddress: input.homeAddress,
    updatedAt: new Date().toISOString(),
  };
  drivers[index] = next;
  writeDrivers(drivers);
  return toPublicDriver(next);
}

function toPublicDriver(driver: StoredDriver): Driver {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    homeAddress: driver.homeAddress,
  };
}

export function deleteDriver(id: string): boolean {
  const drivers = readDrivers();
  const next = drivers.filter((driver) => driver.id !== id);
  if (next.length === drivers.length) return false;
  writeDrivers(next);
  return true;
}
