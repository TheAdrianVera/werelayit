import Link from "next/link";
import { getDetailRecipients, type DetailRecipient } from "@/lib/detail";

export const dynamic = "force-dynamic";

export default async function Home() {
  let recipients: DetailRecipient[] = [];
  let error: string | null = null;

  try {
    recipients = await getDetailRecipients();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not read the sheet.";
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-end justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-sm font-medium text-zinc-500">LSMA</p>
            <h1 className="text-2xl font-semibold tracking-tight">Detail</h1>
          </div>
          {error === null ? (
            <p className="text-sm text-zinc-500">
              {recipients.length} {recipients.length === 1 ? "person" : "people"}
            </p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
            {error}
          </p>
        ) : recipients.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
            The Detail tab has no recipient rows yet.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {recipients.map((recipient, index) => (
              <li key={`${recipient.name}-${recipient.address}-${index}`} className="border-b border-zinc-100 last:border-b-0">
                <RecipientRow recipient={recipient} index={index} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function RecipientRow({
  recipient,
  index,
}: {
  recipient: DetailRecipient;
  index: number;
}) {
  const secondary = recipient.address || recipient.phone;

  return (
    <Link
      href={`/people/${index}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {recipient.name || "Unnamed"}
        </span>
        {secondary ? (
          <span className="block truncate text-sm text-zinc-500">{secondary}</span>
        ) : null}
      </span>
      {recipient.bagCount ? (
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
          {recipient.bagCount} {recipient.bagCount === "1" ? "bag" : "bags"}
        </span>
      ) : null}
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 shrink-0 text-zinc-400"
      >
        <path
          fillRule="evenodd"
          d="M7.22 4.22a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.06-1.06L11.94 10 7.22 5.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </Link>
  );
}
