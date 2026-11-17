"use client";

import type { ReactNode } from "react";

export type SelectedStop = {
  key: string;
  name: string;
  group: string;
};

export type SelectedDriver = {
  id: string;
  name: string;
};

export function WeekSelection({
  open,
  drivers,
  stops,
  onToggleOpen,
  onRemoveDriver,
  onRemoveStop,
  onClearDrivers,
  onClearStops,
}: {
  open: boolean;
  drivers: SelectedDriver[];
  stops: SelectedStop[];
  onToggleOpen: () => void;
  onRemoveDriver: (id: string) => void;
  onRemoveStop: (key: string) => void;
  onClearDrivers: () => void;
  onClearStops: () => void;
}) {
  const groupCounts = new Map<string, number>();
  for (const stop of stops) {
    const group = stop.group.trim() || "Other";
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
  }

  return (
    <section
      aria-label="This week's selection"
      className="shrink-0 border-b border-zinc-200 bg-white"
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <ChevronIcon open={open} />
          <span className="text-sm font-semibold tracking-tight">This week</span>
          <span className="truncate text-sm text-zinc-500">
            <Count value={stops.length} singular="stop" plural="stops" />
            <span aria-hidden="true"> · </span>
            <Count value={drivers.length} singular="driver" plural="drivers" />
          </span>
        </button>
      </div>

      {open ? (
        <div className="max-h-64 overflow-y-auto border-t border-zinc-100 px-4 py-4">
          {drivers.length === 0 && stops.length === 0 ? (
            <p className="text-sm leading-6 text-zinc-600">
              Pick drivers on the left and stops on the right. Selected rows
              show up here, and you can remove any of them.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <SelectionGroup
                title="Drivers"
                count={drivers.length}
                onClear={onClearDrivers}
                empty="No drivers selected."
              >
                {drivers.map((driver) => (
                  <Chip
                    key={driver.id}
                    label={driver.name}
                    onRemove={() => onRemoveDriver(driver.id)}
                  />
                ))}
              </SelectionGroup>

              <SelectionGroup
                title="Stops"
                count={stops.length}
                onClear={onClearStops}
                empty="No stops selected."
                note={
                  groupCounts.size > 0
                    ? [...groupCounts.entries()]
                        .map(([group, count]) => `${group} ${count}`)
                        .join(" · ")
                    : undefined
                }
              >
                {stops.map((stop) => (
                  <Chip
                    key={stop.key}
                    label={
                      stop.group.trim()
                        ? `${stop.name} · ${stop.group.trim()}`
                        : stop.name
                    }
                    onRemove={() => onRemoveStop(stop.key)}
                  />
                ))}
              </SelectionGroup>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function SelectionGroup({
  title,
  count,
  onClear,
  empty,
  note,
  children,
}: {
  title: string;
  count: number;
  onClear: () => void;
  empty: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          {title}
          <span className="ml-1.5 font-medium text-zinc-500">{count}</span>
        </h2>
        {count > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            Clear
          </button>
        ) : null}
      </div>
      {count === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <>
          {note ? (
            <p className="mb-2 text-xs font-medium text-zinc-500">{note}</p>
          ) : null}
          <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${label} from this week`}
      className="inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 py-1 pr-2 pl-2.5 text-sm text-emerald-950 ring-1 ring-emerald-200 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
    >
      <span className="truncate">{label}</span>
      <span aria-hidden="true" className="text-emerald-700">
        ×
      </span>
    </button>
  );
}

function Count({
  value,
  singular,
  plural,
}: {
  value: number;
  singular: string;
  plural: string;
}) {
  return (
    <span className={value > 0 ? "font-medium text-emerald-800" : undefined}>
      {value} {value === 1 ? singular : plural}
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
        open ? "rotate-90" : ""
      }`}
    >
      <path
        d="M7.5 4.5 13 10l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
