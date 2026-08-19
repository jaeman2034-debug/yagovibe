/**
 * PR4-1.5 — Federation guest teams (non-member venue parties).
 * Path: federations/{slug}/guestTeams/{guestTeamId}
 */

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";

export type GuestTeamContactPerson = {
  name: string;
  phone: string;
  uid?: string;
  fcmToken?: string | null;
};

export type FederationGuestTeam = {
  id: string;
  guestTeamId: string;
  teamName: string;
  contacts: {
    chairman: GuestTeamContactPerson | null;
    manager: GuestTeamContactPerson | null;
    coach: GuestTeamContactPerson | null;
  };
  status: "active" | "converted" | "archived";
  linkedPlatformTeamId: string | null;
};

function parsePerson(raw: unknown): GuestTeamContactPerson | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  const name = typeof d.name === "string" ? d.name.trim() : "";
  const phone = typeof d.phone === "string" ? d.phone.trim() : "";
  const uid = typeof d.uid === "string" ? d.uid.trim() : "";
  if (!name && !phone && !uid) return null;
  return {
    name,
    phone,
    uid: uid || undefined,
    fcmToken: typeof d.fcmToken === "string" ? d.fcmToken : null,
  };
}

export async function createFederationGuestTeam(input: {
  federationSlug: string;
  teamName: string;
  contacts: {
    chairman?: { name?: string; phone?: string } | null;
    manager?: { name?: string; phone?: string } | null;
    coach?: { name?: string; phone?: string } | null;
  };
}): Promise<{ ok: true; guestTeamId: string; teamName: string }> {
  const callable = httpsCallable<
    typeof input,
    { ok: true; guestTeamId: string; teamName: string }
  >(functions, "createFederationGuestTeam");
  const res = await callable(input);
  return res.data;
}

type GuestTeamContactInput = { name?: string; phone?: string } | null;

export async function updateFederationGuestTeam(input: {
  federationSlug: string;
  guestTeamId: string;
  teamName: string;
  contacts: {
    chairman?: GuestTeamContactInput;
    manager?: GuestTeamContactInput;
    coach?: GuestTeamContactInput;
  };
}): Promise<{ ok: true; guestTeamId: string; teamName: string }> {
  const callable = httpsCallable<
    typeof input,
    { ok: true; guestTeamId: string; teamName: string }
  >(functions, "updateFederationGuestTeam");
  const res = await callable(input);
  return res.data;
}

export async function archiveFederationGuestTeam(input: {
  federationSlug: string;
  guestTeamId: string;
}): Promise<{ ok: true; guestTeamId: string; status: "archived" }> {
  const callable = httpsCallable<
    typeof input,
    { ok: true; guestTeamId: string; status: "archived" }
  >(functions, "archiveFederationGuestTeam");
  const res = await callable(input);
  return res.data;
}

export async function listFederationGuestTeams(
  federationSlug: string
): Promise<FederationGuestTeam[]> {
  const col = collection(db, "federations", federationSlug, "guestTeams");
  let snap;
  try {
    snap = await getDocs(
      query(col, where("status", "==", "active"), orderBy("teamName"), limit(200))
    );
  } catch {
    snap = await getDocs(query(col, limit(200)));
  }
  return snap.docs
    .map((d) => {
      const raw = d.data() as Record<string, unknown>;
      const status =
        raw.status === "converted" || raw.status === "archived"
          ? raw.status
          : "active";
      if (status !== "active") return null;
      const c =
        raw.contacts && typeof raw.contacts === "object"
          ? (raw.contacts as Record<string, unknown>)
          : {};
      return {
        id: d.id,
        guestTeamId: String(raw.guestTeamId || d.id),
        teamName: String(raw.teamName || d.id),
        contacts: {
          chairman: parsePerson(c.chairman),
          manager: parsePerson(c.manager),
          coach: parsePerson(c.coach),
        },
        status,
        linkedPlatformTeamId:
          raw.linkedPlatformTeamId != null
            ? String(raw.linkedPlatformTeamId)
            : null,
      } satisfies FederationGuestTeam;
    })
    .filter((x): x is FederationGuestTeam => !!x)
    .sort((a, b) => a.teamName.localeCompare(b.teamName, "ko"));
}
