/**
 * Sprint 3-1 — Read-only data loaders for Ops Observability.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { listFederationTeams } from "@/services/federationOperatingService";
import type { TeamObservabilityDoc } from "@/lib/federation/opsObservability";

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (
    typeof v === "object" &&
    v &&
    "toDate" in v &&
    typeof (v as { toDate: () => Date }).toDate === "function"
  ) {
    try {
      return (v as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Lightweight venue ops log row for timeline feed */
export type OpsVenueLogRow = {
  id: string;
  changeType: string;
  bookingDate: string;
  startTime: string;
  venueId: string;
  teamHint: string | null;
  changedByUid: string;
  at: Date | null;
};

export function formatChangeLogType(changeType: string): string {
  switch (changeType) {
    case "PAYMENT_CLAIM":
      return "Claim";
    case "PAYMENT_CONFIRM":
      return "Payment Confirmed";
    case "PAYMENT_UNCONFIRM":
      return "Payment Unconfirm";
    case "ALLOCATION_FINALIZE":
      return "Finalized";
    case "ALLOCATION_UNFINALIZE":
      return "Unfinalize";
    case "RESERVATION_CREATED":
      return "Reservation Created";
    case "REALLOCATE":
      return "Reallocated";
    case "CANCEL":
      return "Cancelled";
    default:
      return changeType || "Event";
  }
}

/** Recent venue allocation change logs (federation-wide, best-effort). */
export async function listRecentVenueChangeLogs(
  federationSlug: string,
  max = 40
): Promise<OpsVenueLogRow[]> {
  const col = collection(db, "federations", federationSlug, "venueAllocationChangeLogs");
  let snap;
  try {
    snap = await getDocs(query(col, orderBy("createdAt", "desc"), limit(max)));
  } catch {
    try {
      snap = await getDocs(query(col, orderBy("changedAt", "desc"), limit(max)));
    } catch {
      try {
        snap = await getDocs(query(col, limit(max)));
      } catch {
        return [];
      }
    }
  }

  return snap.docs.map((d) => {
    const r = d.data() as Record<string, unknown>;
    const toTeam = typeof r.toTeamId === "string" ? r.toTeamId : null;
    const fromTeam = typeof r.fromTeamId === "string" ? r.fromTeamId : null;
    return {
      id: d.id,
      changeType: typeof r.changeType === "string" ? r.changeType : "OTHER",
      bookingDate: typeof r.bookingDate === "string" ? r.bookingDate : "",
      startTime: typeof r.startTime === "string" ? r.startTime : "",
      venueId: typeof r.venueId === "string" ? r.venueId : "",
      teamHint: toTeam || fromTeam,
      changedByUid: typeof r.changedByUid === "string" ? r.changedByUid : "",
      at: toDate(r.createdAt) || toDate(r.changedAt),
    };
  });
}

/**
 * Load platform teams linked to federation operating roster (capped).
 */
export async function listTeamsForOpsObservability(
  federationSlug: string,
  max = 40
): Promise<TeamObservabilityDoc[]> {
  const operating = await listFederationTeams(federationSlug);
  const platformIds = operating
    .map((t) => t.platformTeamId)
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .slice(0, max);

  const out: TeamObservabilityDoc[] = [];
  await Promise.all(
    platformIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, "teams", id));
        if (!snap.exists()) {
          out.push({ id, name: id, createdAt: null });
          return;
        }
        const r = snap.data() as Record<string, unknown>;
        out.push({
          id,
          name: typeof r.name === "string" ? r.name : id,
          createdAt: toDate(r.createdAt),
          slug: typeof r.slug === "string" ? r.slug : null,
          slugCreatedAt: r.slugCreatedAt,
          logoUrl: r.logoUrl,
          aiProfile: r.aiProfile,
          coverImageUrl: r.coverImageUrl,
          heroImage: r.heroImage,
        });
      } catch {
        out.push({ id, createdAt: null });
      }
    })
  );

  for (const t of operating.slice(0, max)) {
    if (t.platformTeamId) continue;
    if (out.length >= max) break;
    out.push({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt ? new Date(t.createdAt) : null,
      slug: null,
    });
  }

  return out;
}
