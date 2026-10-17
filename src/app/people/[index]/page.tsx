import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getDetailRecipients } from "@/lib/detail";

export const dynamic = "force-dynamic";

type PersonPageProps = {
  params: Promise<{ index: string }>;
};

function parseIndex(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

const loadRecipient = cache(async function loadRecipient(indexValue: string) {
  const index = parseIndex(indexValue);
  if (index === null) return { error: null, recipient: null };

  try {
    const recipients = await getDetailRecipients();
    return { error: null, recipient: recipients[index] ?? null };
  } catch (caught) {
    const error = caught instanceof Error ? caught.message : "Could not read the sheet.";
    return { error, recipient: null };
  }
});

export async function generateMetadata({ params }: PersonPageProps): Promise<Metadata> {
  const { index } = await params;
  const { recipient } = await loadRecipient(index);
  return { title: recipient?.name || "Person" };
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { index: indexValue } = await params;
  const index = parseIndex(indexValue);
  if (index === null) notFound();

  const { error, recipient } = await loadRecipient(indexValue);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
            ← All people
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {recipient?.name || (error ? "Detail" : "Unnamed")}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
            {error}
          </p>
        ) : recipient === null ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
            That person is not on the Detail tab.{" "}
            <Link href="/" className="font-medium text-zinc-900 underline">
              Back to the list
            </Link>
          </p>
        ) : (
          <dl className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {recipient.fields.map((field) => (
              <div key={field.label} className="border-b border-zinc-100 px-4 py-3 last:border-b-0">
                <dt className="text-xs font-medium text-zinc-500">{field.label}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-900">
                  {field.href ? (
                    <a href={field.href} className="underline">
                      {field.value}
                    </a>
                  ) : (
                    field.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </main>
    </div>
  );
}
