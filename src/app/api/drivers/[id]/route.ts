import { NextResponse } from "next/server";
import { parseDriverInput } from "@/lib/driver-input";
import { deleteDriver, updateDriver } from "@/lib/drivers";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

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
    const driver = updateDriver(id, parsed.input);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }
    return NextResponse.json({ driver });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not save the driver.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const removed = deleteDriver(id);
    if (!removed) {
      return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not remove the driver.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
