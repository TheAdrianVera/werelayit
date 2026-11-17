import { NextResponse } from "next/server";
import { parseDriverInput } from "@/lib/driver-input";
import { createDriver, listDrivers } from "@/lib/drivers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ drivers: listDrivers() });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not read drivers.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Driver details are missing." },
      { status: 400 },
    );
  }

  const parsed = parseDriverInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const driver = createDriver(parsed.input);
    return NextResponse.json({ driver }, { status: 201 });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not save the driver.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
