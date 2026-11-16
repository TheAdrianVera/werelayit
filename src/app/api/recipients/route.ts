import { NextResponse } from "next/server";
import { getDetailRecipients } from "@/lib/detail";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const recipients = await getDetailRecipients();
    return NextResponse.json({ recipients });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not read the sheet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
