"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  appleMapsDirectionsUrl,
  googleMapsDirectionsUrl,
} from "@/lib/mapLinks";
import type { DetailRecipient } from "@/lib/recipients";

const MAIN_GROUPS = ["A", "B", "AB", "BA"] as const;
type GroupFilter = "all" | (typeof MAIN_GROUPS)[number] | "other";

function normalizeGroup(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function matchesGroupFilter(person: DetailRecipient, filter: GroupFilter): boolean {
  const group = normalizeGroup(person.group);
  if (filter === "all") return true;
  if (filter === "other") {
    return !MAIN_GROUPS.includes(group as (typeof MAIN_GROUPS)[number]);
  }
  return group === filter;
}

export function Dashboard({
  recipients,
  sheetUrl,
}: {
  recipients: DetailRecipient[];
  sheetUrl: string | null;
}) {
  const [people, setPeople] = useState(recipients);
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [infoIndex, setInfoIndex] = useState<number | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);

  const visiblePeople = people.filter((person) =>
    matchesGroupFilter(person, groupFilter),
  );
  const infoRecipient = infoIndex === null ? null : people[infoIndex] ?? null;

  const filterCounts: Record<GroupFilter, number> = {
    all: people.length,
    A: 0,
    B: 0,
    AB: 0,
    BA: 0,
    other: 0,
  };
  for (const person of people) {
    const group = normalizeGroup(person.group);
    if (MAIN_GROUPS.includes(group as (typeof MAIN_GROUPS)[number])) {
      filterCounts[group as (typeof MAIN_GROUPS)[number]] += 1;
    } else {
      filterCounts.other += 1;
    }
  }

  function selectGroupFilter(next: GroupFilter) {
    setGroupFilter(next);
    setSelectedIndex(null);
    setInfoIndex(null);
  }

  async function pullStopData() {
    if (pulling) return;

    setPulling(true);
    setPullError(null);

    try {
      const response = await fetch("/api/recipients", { cache: "no-store" });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Could not pull stop data from the sheet.";
        throw new Error(message);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("recipients" in data) ||
        !Array.isArray((data as { recipients: unknown }).recipients)
      ) {
        throw new Error("Unexpected response while pulling stop data.");
      }

      const nextPeople = (data as { recipients: DetailRecipient[] }).recipients;
      setPeople(nextPeople);
      setSelectedIndex((current) =>
        current !== null && current < nextPeople.length ? current : null,
      );
      setInfoIndex((current) =>
        current !== null && current < nextPeople.length ? current : null,
      );
    } catch (caught) {
      setPullError(
        caught instanceof Error
          ? caught.message
          : "Could not pull stop data from the sheet.",
      );
    } finally {
      setPulling(false);
    }
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-zinc-50 text-zinc-900">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">Route planner</p>
          <h1 className="truncate text-lg font-semibold tracking-tight">
            People
          </h1>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={pullStopData}
            disabled={pulling}
            aria-busy={pulling}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <RefreshIcon spinning={pulling} />
            {pulling ? "Pulling…" : "Pull stop data"}
          </button>
          <p className="max-w-[16rem] text-right text-xs leading-4 text-zinc-500 sm:max-w-none">
            Stop data is pulled from{" "}
            {sheetUrl ? (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-zinc-800 underline underline-offset-2 hover:text-zinc-950"
              >
                this Google Sheet
              </a>
            ) : (
              "a Google Sheet"
            )}
            .
          </p>
        </div>
      </header>

      {pullError ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {pullError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="hidden min-h-0 min-w-0 flex-1 flex-col border-r border-zinc-200 bg-white lg:flex" />

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="border-b border-zinc-200 bg-white px-4 py-4">
            <p className="text-sm font-medium text-zinc-500">Detail</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {visiblePeople.length}{" "}
              {visiblePeople.length === 1 ? "person" : "people"}
              {groupFilter !== "all" ? (
                <span className="ml-2 text-base font-medium text-zinc-500">
                  of {people.length}
                </span>
              ) : null}
            </h2>

            <div
              className="mt-3 flex flex-wrap gap-2"
              role="group"
              aria-label="Filter by column A group"
            >
              {(
                [
                  { id: "all", label: "All" },
                  { id: "A", label: "A" },
                  { id: "B", label: "B" },
                  { id: "AB", label: "AB" },
                  { id: "BA", label: "BA" },
                  { id: "other", label: "Other" },
                ] as const
              ).map((option) => {
                const active = groupFilter === option.id;
                const count = filterCounts[option.id];
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectGroupFilter(option.id)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {option.label}
                    <span
                      className={`text-xs ${
                        active ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {people.length === 0 ? (
              <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                The Detail tab has no recipient rows yet. Pull stop data after
                updating the spreadsheet.
              </p>
            ) : visiblePeople.length === 0 ? (
              <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                No people in this group.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                {visiblePeople.map((person) => {
                  const index = people.indexOf(person);
                  return (
                    <li
                      key={`${person.name}-${person.address}-${index}`}
                      className="border-b border-zinc-100 last:border-b-0"
                    >
                      <div
                        className={`flex w-full items-center gap-2 px-2 py-1 transition-colors ${
                          selectedIndex === index
                            ? "bg-zinc-100 shadow-[inset_3px_0_0_0_#18181b]"
                            : "hover:bg-zinc-50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedIndex(index)}
                          aria-current={
                            selectedIndex === index ? "true" : undefined
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left focus-visible:outline-none"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {person.name || "Unnamed"}
                            </span>
                            {person.address || person.phone ? (
                              <span className="block truncate text-sm text-zinc-500">
                                {person.address || person.phone}
                              </span>
                            ) : null}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {person.group ? (
                              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                                Group {person.group}
                              </span>
                            ) : null}
                            {person.bagCount ? (
                              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                                {person.bagCount}{" "}
                                {person.bagCount === "1" ? "bag" : "bags"}
                              </span>
                            ) : null}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInfoIndex(index)}
                          aria-label={`View info for ${person.name || "unnamed person"}`}
                          className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                        >
                          <InfoIcon />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {infoRecipient ? (
        <PersonInfoModal
          recipient={infoRecipient}
          onClose={() => setInfoIndex(null)}
        />
      ) : null}
    </div>
  );
}

function PersonInfoModal({
  recipient,
  onClose,
}: {
  recipient: DetailRecipient;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-500">Person info</p>
            <h2
              id={titleId}
              className="mt-1 truncate text-2xl font-semibold tracking-tight"
            >
              {recipient.name || "Unnamed"}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <DriverStop recipient={recipient} />
        </div>
      </div>
    </div>
  );
}

function DriverStop({ recipient }: { recipient: DetailRecipient }) {
  const skipped = new Set(["Phone", "Address", "Saturday Bag Count"]);
  const notes = recipient.fields.filter((field) => !skipped.has(field.label));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        {recipient.address ? (
          <p className="text-base leading-6">{recipient.address}</p>
        ) : (
          <p className="text-sm text-zinc-500">No address on this row.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {recipient.bagCount ? (
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200">
              {recipient.bagCount} {recipient.bagCount === "1" ? "bag" : "bags"}
            </span>
          ) : null}
          {recipient.phone ? (
            <a
              href={`tel:${recipient.phone}`}
              className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 underline ring-1 ring-zinc-200"
            >
              {recipient.phone}
            </a>
          ) : null}
        </div>
      </div>

      {recipient.address ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href={googleMapsDirectionsUrl(recipient.address)}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white"
          >
            Open in Google Maps
          </a>
          <a
            href={appleMapsDirectionsUrl(recipient.address)}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900"
          >
            Open in Apple Maps
          </a>
        </div>
      ) : null}

      {notes.length > 0 ? (
        <dl className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {notes.map((field) => (
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
      ) : null}
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`}
    >
      <path
        d="M19.5 12a7.5 7.5 0 1 1-1.7-4.7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M19.5 4.5v4.2h-4.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 10.5v6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7.25" r="1" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
