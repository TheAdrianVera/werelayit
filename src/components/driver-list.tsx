"use client";

import { useState } from "react";
import type { Driver } from "@/lib/driver";

type Draft = {
  id: string | null;
  name: string;
  phone: string;
  email: string;
  homeAddress: string;
};

const emptyDraft = (): Draft => ({
  id: null,
  name: "",
  phone: "",
  email: "",
  homeAddress: "",
});

export function DriverList({
  initialDrivers,
  loadError,
}: {
  initialDrivers: Driver[];
  loadError: string | null;
}) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(loadError);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function startAdd() {
    setError(null);
    setConfirmDeleteId(null);
    setDraft(emptyDraft());
  }

  function startEdit(driver: Driver) {
    setError(null);
    setConfirmDeleteId(null);
    setDraft({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      homeAddress: driver.homeAddress,
    });
  }

  function cancelDraft() {
    if (saving) return;
    setDraft(null);
    setError(null);
  }

  async function saveDriver() {
    if (!draft || saving) return;

    const name = draft.name.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name,
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      homeAddress: draft.homeAddress.trim(),
    };

    try {
      const response = await fetch(
        draft.id ? `/api/drivers/${draft.id}` : "/api/drivers",
        {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(errorMessage(data, "Could not save the driver."));
      }

      const driver = readDriver(data);
      if (!driver) {
        throw new Error("Unexpected response while saving the driver.");
      }

      setDrivers((current) =>
        sortDrivers(
          draft.id
            ? current.map((item) => (item.id === driver.id ? driver : item))
            : [...current, driver],
        ),
      );
      setDraft(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save the driver.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeDriver(id: string) {
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/drivers/${id}`, { method: "DELETE" });
      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(errorMessage(data, "Could not remove the driver."));
      }

      setDrivers((current) => current.filter((driver) => driver.id !== id));
      setConfirmDeleteId(null);
      setDraft((current) => (current?.id === id ? null : current));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not remove the driver.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-zinc-200 bg-white lg:border-r lg:border-b-0">
      <div className="shrink-0 border-b border-zinc-200 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-500">Drivers</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {drivers.length} {drivers.length === 1 ? "driver" : "drivers"}
            </h2>
          </div>
          {draft?.id === null ? null : (
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex h-10 shrink-0 items-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              Add driver
            </button>
          )}
        </div>
      </div>

      {draft ? (
        <form
          className="shrink-0 space-y-3 border-b border-zinc-200 px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void saveDriver();
          }}
        >
          <p className="text-sm font-medium text-zinc-700">
            {draft.id ? "Edit driver" : "New driver"}
          </p>
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Name</span>
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              autoFocus
              required
              maxLength={120}
              className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Phone</span>
            <input
              value={draft.phone}
              onChange={(event) =>
                setDraft({ ...draft, phone: event.target.value })
              }
              type="tel"
              autoComplete="tel"
              maxLength={40}
              className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Email</span>
            <input
              value={draft.email}
              onChange={(event) =>
                setDraft({ ...draft, email: event.target.value })
              }
              type="email"
              autoComplete="email"
              maxLength={254}
              className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">
              Home address
            </span>
            <textarea
              value={draft.homeAddress}
              onChange={(event) =>
                setDraft({ ...draft, homeAddress: event.target.value })
              }
              rows={2}
              maxLength={300}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelDraft}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {!draft && error ? (
        <p className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {drivers.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600">
            No drivers yet. Add a name, phone, email, and home address. The
            list is saved on this computer and stays here between visits.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-zinc-200">
            {drivers.map((driver) => {
              const confirming = confirmDeleteId === driver.id;
              const editing = draft?.id === driver.id;
              return (
                <li
                  key={driver.id}
                  className={`border-b border-zinc-100 px-4 py-3 last:border-b-0 ${
                    editing ? "bg-zinc-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{driver.name}</p>
                      {driver.phone ? (
                        <a
                          href={`tel:${driver.phone}`}
                          className="mt-0.5 block truncate text-sm text-zinc-500 underline-offset-2 hover:underline"
                        >
                          {driver.phone}
                        </a>
                      ) : (
                        <p className="mt-0.5 text-sm text-zinc-400">No phone</p>
                      )}
                      {driver.email ? (
                        <a
                          href={`mailto:${driver.email}`}
                          className="mt-0.5 block truncate text-sm text-zinc-500 underline-offset-2 hover:underline"
                        >
                          {driver.email}
                        </a>
                      ) : (
                        <p className="mt-0.5 text-sm text-zinc-400">No email</p>
                      )}
                      {driver.homeAddress ? (
                        <p className="mt-1 text-sm leading-5 text-zinc-600">
                          {driver.homeAddress}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-zinc-400">
                          No home address
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(driver)}
                        className="rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                      >
                        Edit
                      </button>
                      {confirming ? null : (
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setConfirmDeleteId(driver.id);
                          }}
                          className="rounded-lg px-2 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  {confirming ? (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2">
                      <p className="text-sm text-red-800">Remove this driver?</p>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => void removeDriver(driver.id)}
                          disabled={saving}
                          className="rounded-lg bg-red-700 px-2.5 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={saving}
                          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-700 hover:bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function sortDrivers(drivers: Driver[]): Driver[] {
  return [...drivers].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

function errorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return fallback;
}

function readDriver(data: unknown): Driver | null {
  if (typeof data !== "object" || data === null || !("driver" in data)) {
    return null;
  }
  const driver = (data as { driver: unknown }).driver;
  if (typeof driver !== "object" || driver === null) return null;
  const row = driver as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.phone !== "string" ||
    typeof row.email !== "string" ||
    typeof row.homeAddress !== "string"
  ) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    homeAddress: row.homeAddress,
  };
}
