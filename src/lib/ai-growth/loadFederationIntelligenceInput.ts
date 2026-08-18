import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  buildFederationIntelligenceSnapshot,
} from "@/lib/ai-growth/federationDashboardEngine";
import type { FederationIntelligenceSnapshot } from "@/lib/ai-growth/federationDashboardTypes";
import {
  isFederationManagerOnDoc,
  readTeamFederationId,
} from "@/lib/ai-growth/federationMembership";
import {
  loadAcademyIntelligenceSnapshots,
  resolveOperatedAcademyTeams,
  type OperatedAcademyTeamRef,
} from "@/lib/ai-growth/loadMultiAcademyDashboardInput";
import type { AcademyIntelligenceSnapshot } from "@/lib/ai-growth/multiAcademyDashboardTypes";
import { isAcademyOrganization } from "@/lib/p0/terminology";

export { resolveOperatedAcademyTeams };

type AcademyWithFederation = {
  federationId: string | null;
  snapshot: AcademyIntelligenceSnapshot;
};

async function readUserFederationSlugCandidates(uid: string): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return [];
    const data = snap.data() as Record<string, unknown>;
    const slugs = new Set<string>();
    const preferred = data.preferredFederationSlug;
    if (typeof preferred === "string" && preferred.trim()) slugs.add(preferred.trim());
    const linked = data.linkedFederationSlug;
    if (typeof linked === "string" && linked.trim()) slugs.add(linked.trim());
    const list = data.federationSlugs;
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === "string" && item.trim()) slugs.add(item.trim());
      }
    }
    return [...slugs];
  } catch (error) {
    console.warn("[readUserFederationSlugCandidates]", error);
    return [];
  }
}

async function loadAcademySnapshotsWithFederationLinks(
  teams: OperatedAcademyTeamRef[]
): Promise<AcademyWithFederation[]> {
  const snapshots = await loadAcademyIntelligenceSnapshots(teams);
  const byTeamId = new Map(snapshots.map((snapshot) => [snapshot.teamId, snapshot]));

  const entries: AcademyWithFederation[] = [];
  await Promise.all(
    teams.map(async (team) => {
      const snapshot = byTeamId.get(team.teamId);
      if (!snapshot) return;
      try {
        const teamSnap = await getDoc(doc(db, "teams", team.teamId));
        const federationId = teamSnap.exists()
          ? readTeamFederationId(teamSnap.data() as Record<string, unknown>)
          : null;
        entries.push({ federationId, snapshot });
      } catch (error) {
        console.warn("[loadAcademySnapshotsWithFederationLinks]", team.teamId, error);
        entries.push({ federationId: null, snapshot });
      }
    })
  );

  return entries;
}

async function loadAcademySnapshotForTeamId(
  teamId: string
): Promise<AcademyIntelligenceSnapshot | null> {
  try {
    const teamSnap = await getDoc(doc(db, "teams", teamId));
    if (!teamSnap.exists()) return null;
    const data = teamSnap.data();
    if (!isAcademyOrganization(data)) return null;
    const teamName = String(data.name ?? teamId);
    const [snapshot] = await loadAcademyIntelligenceSnapshots([
      { teamId, teamName, role: "staff" },
    ]);
    return snapshot ?? null;
  } catch (error) {
    console.warn("[loadAcademySnapshotForTeamId]", teamId, error);
    return null;
  }
}

/** H-1 — Federation membership + G-1 academy snapshots → federation groups */
export async function loadFederationIntelligenceSnapshots(
  uid: string | null | undefined,
  memberships: Array<{ teamId: string; role?: string; status: string }>
): Promise<FederationIntelligenceSnapshot[]> {
  const operatedTeams = await resolveOperatedAcademyTeams(memberships);
  const academyEntries = await loadAcademySnapshotsWithFederationLinks(operatedTeams);

  const federationIds = new Set<string>();
  for (const entry of academyEntries) {
    if (entry.federationId) federationIds.add(entry.federationId);
  }
  if (uid) {
    for (const slug of await readUserFederationSlugCandidates(uid)) {
      federationIds.add(slug);
    }
  }

  if (federationIds.size === 0) {
    return [];
  }

  const grouped = new Map<string, AcademyIntelligenceSnapshot[]>();

  for (const entry of academyEntries) {
    if (!entry.federationId) continue;
    const list = grouped.get(entry.federationId) ?? [];
    list.push(entry.snapshot);
    grouped.set(entry.federationId, list);
  }

  const results: FederationIntelligenceSnapshot[] = [];

  await Promise.all(
    [...federationIds].map(async (federationId) => {
      try {
        const fedSnap = await getDoc(doc(db, "federations", federationId));
        if (!fedSnap.exists()) return;

        const fedData = fedSnap.data() as Record<string, unknown>;
        const federationName = String(fedData.name ?? federationId);
        const isManager = isFederationManagerOnDoc(fedData, uid);
        const operatedInFed = grouped.get(federationId) ?? [];

        if (!isManager && operatedInFed.length === 0) return;

        const byTeamId = new Map<string, AcademyIntelligenceSnapshot>();
        for (const snapshot of operatedInFed) {
          byTeamId.set(snapshot.teamId, snapshot);
        }

        if (isManager) {
          const memberTeamIds = Array.isArray(fedData.memberTeamIds)
            ? (fedData.memberTeamIds as unknown[])
            : [];
          for (const rawId of memberTeamIds) {
            const teamId = String(rawId || "").trim();
            if (!teamId || byTeamId.has(teamId)) continue;
            const snapshot = await loadAcademySnapshotForTeamId(teamId);
            if (snapshot) byTeamId.set(teamId, snapshot);
          }
        }

        const academies = [...byTeamId.values()];
        if (academies.length === 0) return;

        results.push(
          buildFederationIntelligenceSnapshot(federationId, federationName, academies)
        );
      } catch (error) {
        console.warn("[loadFederationIntelligenceSnapshots]", federationId, error);
      }
    })
  );

  return results.sort((a, b) => a.federationName.localeCompare(b.federationName, "ko"));
}
