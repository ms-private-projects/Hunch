/** Formatting in the viewer's locale: money, percentages, numbers and dates. */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  // A date-only value is a calendar day, not UTC midnight: keep it on that day in every zone.
  const date = new Date(DATE_ONLY.test(value) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMoney(
  value: number | null | undefined,
  currency = "USD",
  options: { compact?: boolean } = {},
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      ...(options.compact ? { notation: "compact" } : {}),
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** `value` is a fraction (0.0123 → 1.23%). */
export function formatPercent(
  value: number | null | undefined,
  options: { digits?: number; signed?: boolean } = {},
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const digits = options.digits ?? 2;
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: options.signed ? "exceptZero" : "auto",
  }).format(value);
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatQuantity(value: number | null | undefined): string {
  return formatNumber(value, 4);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

/** `active_practice` → `Active practice`. */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const text = value.replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function parseList(text: string, separator: RegExp): string[] {
  return Array.from(
    new Set(
      text
        .split(separator)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );
}

export function shortUid(uid: string | null | undefined): string {
  if (!uid) return "—";
  return uid.length > 12 ? `${uid.slice(0, 8)}…` : uid;
}
