"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { DriverList } from "@/components/driver-list";
import { WeekSelection } from "@/components/week-selection";
import type { Driver } from "@/lib/driver";
import {
  appleMapsDirectionsUrl,
  googleMapsDirectionsUrl,
} from "@/lib/mapLinks";
import type { DetailRecipient } from "@/lib/recipients";

const MAIN_GROUPS = ["A", "B", "AB", "BA"] as const;
type GroupFilter = "all" | (typeof MAIN_GROUPS)[number] | "other";

const STOP_SELECTION_KEY = "werelayit.selectedStops";
const DRIVER_SELECTION_KEY = "werelayit.selectedDrivers";
const SELECTION_OPEN_KEY = "werelayit.selectionOpen";
const FIELD_SEP = "\u001f";

function readStoredSet(key: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function writeStoredSet(key: string, values: ReadonlySet<string>) {
  try {
    sessionStorage.setItem(key, JSON.stringify([...values]));
  } catch {
    // Selection still works for this visit if storage is unavailable.
  }
}

function withSelectionKeys(people: DetailRecipient[]) {
  const seen = new Map<string, number>();
  return people.map((person) => {
    const base = [person.name, person.address, person.phone, person.group].join(
      FIELD_SEP,
    );
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    return {
      person,
      key: occurrence === 0 ? base : `${base}${FIELD_SEP}${occurrence}`,
    };
  });
}

function toggleMember(current: Set<string>, value: string): Set<string> {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

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
  drivers,
  driverError,
}: {
  recipients: DetailRecipient[];
  sheetUrl: string | null;
  drivers: Driver[];
  driverError: string | null;
}) {
  const [people, setPeople] = useState(recipients);
  const [driverPool, setDriverPool] = useState(drivers);
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [selectedStopKeys, setSelectedStopKeys] = useState<Set<string>>(new Set());
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set());
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectionReady, setSelectionReady] = useState(false);
  const [infoIndex, setInfoIndex] = useState<number | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);

  const keyedPeople = useMemo(() => withSelectionKeys(people), [people]);
  const visiblePeople = keyedPeople.filter(({ person }) =>
    matchesGroupFilter(person, groupFilter),
  );
  const infoRecipient = infoIndex === null ? null : people[infoIndex] ?? null;
  const selectedStops = keyedPeople
    .filter((item) => selectedStopKeys.has(item.key))
    .map((item) => ({
      key: item.key,
      name: item.person.name || "Unnamed",
      group: item.person.group,
    }));
  const selectedDrivers = driverPool
    .filter((driver) => selectedDriverIds.has(driver.id))
    .map((driver) => ({ id: driver.id, name: driver.name }));
  const visibleSelectedCount = visiblePeople.filter((item) =>
    selectedStopKeys.has(item.key),
  ).length;

  const syncDrivers = useCallback((next: Driver[]) => {
    setDriverPool(next);
    setSelectedDriverIds((current) => {
      const live = new Set(next.map((driver) => driver.id));
      const kept = new Set([...current].filter((id) => live.has(id)));
      return kept.size === current.size ? current : kept;
    });
  }, []);

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

  const selectedCounts: Record<GroupFilter, number> = {
    all: selectedStops.length,
    A: 0,
    B: 0,
    AB: 0,
    BA: 0,
    other: 0,
  };
  for (const stop of selectedStops) {
    const group = normalizeGroup(stop.group);
    if (MAIN_GROUPS.includes(group as (typeof MAIN_GROUPS)[number])) {
      selectedCounts[group as (typeof MAIN_GROUPS)[number]] += 1;
    } else {
      selectedCounts.other += 1;
    }
  }

  useEffect(() => {
    setSelectedStopKeys(readStoredSet(STOP_SELECTION_KEY));
    setSelectedDriverIds(readStoredSet(DRIVER_SELECTION_KEY));
    try {
      setSelectionOpen(sessionStorage.getItem(SELECTION_OPEN_KEY) === "1");
    } catch {
      setSelectionOpen(false);
    }
    setSelectionReady(true);
  }, []);

  useEffect(() => {
    if (!selectionReady) return;
    const live = new Set(keyedPeople.map((item) => item.key));
    setSelectedStopKeys((current) => {
      const kept = new Set([...current].filter((key) => live.has(key)));
      return kept.size === current.size ? current : kept;
    });
  }, [keyedPeople, selectionReady]);

  useEffect(() => {
    if (!selectionReady) return;
    writeStoredSet(STOP_SELECTION_KEY, selectedStopKeys);
  }, [selectedStopKeys, selectionReady]);

  useEffect(() => {
    if (!selectionReady) return;
    writeStoredSet(DRIVER_SELECTION_KEY, selectedDriverIds);
  }, [selectedDriverIds, selectionReady]);

  function selectGroupFilter(next: GroupFilter) {
    setGroupFilter(next);
    setInfoIndex(null);
  }

  function toggleStop(key: string) {
    setSelectedStopKeys((current) => toggleMember(current, key));
  }

  function selectShownStops() {
    setSelectedStopKeys((current) => {
      const next = new Set(current);
      for (const item of visiblePeople) next.add(item.key);
      return next;
    });
  }

  function selectAllDrivers() {
    setSelectedDriverIds(new Set(driverPool.map((driver) => driver.id)));
  }

  function clearShownStops() {
    setSelectedStopKeys((current) => {
      const next = new Set(current);
      for (const item of visiblePeople) next.delete(item.key);
      return next;
    });
  }

  function toggleSelectionOpen() {
    setSelectionOpen((current) => {
      const next = !current;
      try {
        sessionStorage.setItem(SELECTION_OPEN_KEY, next ? "1" : "0");
      } catch {
        // The section still opens and closes for this visit.
      }
      return next;
    });
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

      <WeekSelection
        open={selectionOpen}
        drivers={selectedDrivers}
        stops={selectedStops}
        onToggleOpen={toggleSelectionOpen}
        onRemoveDriver={(id) =>
          setSelectedDriverIds((current) => toggleMember(current, id))
        }
        onRemoveStop={toggleStop}
        onClearDrivers={() => setSelectedDriverIds(new Set())}
        onClearStops={() => setSelectedStopKeys(new Set())}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)]">
        <DriverList
          initialDrivers={drivers}
          loadError={driverError}
          selectedIds={selectedDriverIds}
          onToggleSelected={(id) =>
            setSelectedDriverIds((current) => toggleMember(current, id))
          }
          onSelectAll={selectAllDrivers}
          onClearSelected={() => setSelectedDriverIds(new Set())}
          onDriversChange={syncDrivers}
        />

        <div className="order-3 shrink-0 border-b border-zinc-200 bg-white px-4 py-3 lg:col-start-2 lg:row-start-1 lg:h-full">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
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
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={selectShownStops}
                disabled={
                  visiblePeople.length === 0 ||
                  visibleSelectedCount === visiblePeople.length
                }
                aria-label={
                  groupFilter === "all"
                    ? "Select shown people"
                    : `Select shown people in ${groupFilter === "other" ? "Other" : groupFilter}`
                }
                className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                Select shown
              </button>
              <button
                type="button"
                onClick={clearShownStops}
                disabled={visibleSelectedCount === 0}
                aria-label={
                  groupFilter === "all"
                    ? "Clear shown people"
                    : `Clear shown people in ${groupFilter === "other" ? "Other" : groupFilter}`
                }
                className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                Clear shown
              </button>
            </div>
          </div>
          <p
            className={`mt-1 text-sm ${
              visibleSelectedCount > 0
                ? "font-medium text-emerald-800"
                : "text-zinc-500"
            }`}
          >
            {visibleSelectedCount > 0
              ? `${visibleSelectedCount} selected${
                  selectedStops.length !== visibleSelectedCount
                    ? ` · ${selectedStops.length} this week`
                    : " this week"
                }`
              : "None selected"}
          </p>

          <div
            className="mt-3 flex gap-1 overflow-x-auto"
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
                const picked = selectedCounts[option.id];
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectGroupFilter(option.id)}
                    aria-pressed={active}
                    aria-label={
                      picked > 0
                        ? `${option.label}, ${count} people, ${picked} selected`
                        : `${option.label}, ${count} people`
                    }
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
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
                    {picked > 0 ? (
                      <span
                        className={`text-xs font-semibold ${
                          active ? "text-emerald-200" : "text-emerald-700"
                        }`}
                      >
                        {picked}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="order-4 min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-4 py-4 lg:col-start-2 lg:row-start-2 lg:h-full lg:flex-none">
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
                {visiblePeople.map(({ person, key }) => {
                  const index = people.indexOf(person);
                  const selected = selectedStopKeys.has(key);
                  const name = person.name || "Unnamed";
                  return (
                    <li
                      key={key}
                      onClick={(event) => {
                        if (isInteractiveTarget(event.target)) return;
                        toggleStop(key);
                      }}
                      className={`cursor-pointer border-b border-zinc-100 last:border-b-0 ${
                        selected
                          ? "bg-emerald-50 shadow-[inset_3px_0_0_0_#047857]"
                          : "hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex w-full items-center gap-2 px-2 py-1">
                        <div className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleStop(key)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`${selected ? "Remove" : "Select"} ${name} for this week`}
                            className="h-4 w-4 shrink-0 accent-emerald-700"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {name}
                            </span>
                            {person.address || person.phone ? (
                              <span className="block truncate text-sm text-zinc-500">
                                {person.address || person.phone}
                              </span>
                            ) : null}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {person.group ? (
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  selected
                                    ? "bg-white text-emerald-900 ring-1 ring-emerald-200"
                                    : "bg-zinc-100 text-zinc-700"
                                }`}
                              >
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
                        </div>

                        <button
                          type="button"
                          onClick={() => setInfoIndex(index)}
                          aria-label={`View info for ${name}`}
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

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("a, button, input"));
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
