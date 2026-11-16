import { Dashboard } from "@/components/dashboard";
import { getDetailRecipients, type DetailRecipient } from "@/lib/detail";

export const dynamic = "force-dynamic";

function sheetUrlFromEnv(): string | null {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
  if (!spreadsheetId || /^\d+$/.test(spreadsheetId)) return null;
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

export default async function Home() {
  let recipients: DetailRecipient[] = [];
  let error: string | null = null;
  const sheetUrl = sheetUrlFromEnv();

  try {
    recipients = await getDetailRecipients();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not read the sheet.";
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900">
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
          {error}
        </p>
      </main>
    );
  }

  return <Dashboard recipients={recipients} sheetUrl={sheetUrl} />;
}
