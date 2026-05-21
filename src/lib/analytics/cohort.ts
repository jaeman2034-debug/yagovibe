export type CohortSourceRow = {
  createdAt?: unknown;
  canceledAt?: unknown;
  billingStatus?: string;
};

export type CohortRetentionRow = {
  cohort: string;
  size: number;
  d1: number;
  d7: number;
  d30: number;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function retainedAt(canceledAt: Date | null, checkpointMs: number): boolean {
  if (!canceledAt) return true;
  return canceledAt.getTime() > checkpointMs;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

export function buildCohortRetentionTable(rows: CohortSourceRow[], recentMonths = 6): CohortRetentionRow[] {
  const byMonth = new Map<string, Array<{ createdAt: Date; canceledAt: Date | null }>>();

  rows.forEach((row) => {
    const createdAt = toDate(row.createdAt);
    if (!createdAt) return;
    const canceledAt = toDate(row.canceledAt);
    const key = toMonthKey(createdAt);
    const list = byMonth.get(key) ?? [];
    list.push({ createdAt, canceledAt });
    byMonth.set(key, list);
  });

  const keys = Array.from(byMonth.keys()).sort();
  const picked = keys.slice(Math.max(0, keys.length - recentMonths));
  return picked.map((key) => {
    const list = byMonth.get(key) ?? [];
    const size = list.length;
    let d1Alive = 0;
    let d7Alive = 0;
    let d30Alive = 0;

    list.forEach((row) => {
      const createdMs = row.createdAt.getTime();
      if (retainedAt(row.canceledAt, createdMs + 1 * 24 * 60 * 60 * 1000)) d1Alive += 1;
      if (retainedAt(row.canceledAt, createdMs + 7 * 24 * 60 * 60 * 1000)) d7Alive += 1;
      if (retainedAt(row.canceledAt, createdMs + 30 * 24 * 60 * 60 * 1000)) d30Alive += 1;
    });

    return {
      cohort: key,
      size,
      d1: pct(d1Alive, size),
      d7: pct(d7Alive, size),
      d30: pct(d30Alive, size),
    };
  });
}
