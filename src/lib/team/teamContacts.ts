/**
 * PR4-1.2 — Team contacts (회장·총무·감독).
 * SoT: teams/{teamId}.contacts.{chairman|manager|coach}
 * 선배정 시 수신자 선택 UI 없음 — 등록된 3명 전원 자동 발송.
 */

import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";

export type TeamContactRole = "chairman" | "manager" | "coach";

export const TEAM_CONTACT_ROLES: TeamContactRole[] = [
  "chairman",
  "manager",
  "coach",
];

export const TEAM_CONTACT_ROLE_LABEL: Record<TeamContactRole, string> = {
  chairman: "회장",
  manager: "총무",
  coach: "감독",
};

export type TeamContactPerson = {
  name: string;
  phone: string;
  uid: string;
  fcmToken: string | null;
};

export type TeamContacts = {
  chairman: TeamContactPerson | null;
  manager: TeamContactPerson | null;
  coach: TeamContactPerson | null;
};

export type TeamContactNotifyTarget = {
  role: TeamContactRole;
  roleLabel: string;
  uid: string;
  name: string;
  phone: string;
};

function parsePerson(raw: unknown): TeamContactPerson | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  const name = typeof d.name === "string" ? d.name.trim() : "";
  const phone = typeof d.phone === "string" ? d.phone.trim() : "";
  const uid = typeof d.uid === "string" ? d.uid.trim() : "";
  // Allow name+phone without uid (SMS later); App push needs uid
  if (!name && !phone && !uid) return null;
  return {
    name,
    phone,
    uid,
    fcmToken: typeof d.fcmToken === "string" ? d.fcmToken : null,
  };
}

export function parseTeamContacts(raw: unknown): TeamContacts {
  const empty: TeamContacts = {
    chairman: null,
    manager: null,
    coach: null,
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const d = raw as Record<string, unknown>;
  return {
    chairman: parsePerson(d.chairman),
    manager: parsePerson(d.manager),
    coach: parsePerson(d.coach),
  };
}

export async function getTeamContacts(teamId: string): Promise<TeamContacts> {
  const id = String(teamId || "").trim();
  if (!id) {
    return { chairman: null, manager: null, coach: null };
  }
  const snap = await getDoc(doc(db, "teams", id));
  if (!snap.exists()) {
    return { chairman: null, manager: null, coach: null };
  }
  return parseTeamContacts(snap.data()?.contacts);
}

/** App-pushable targets only (uid required). Dedupes same uid across roles. */
export function listTeamContactNotifyTargets(
  contacts: TeamContacts
): TeamContactNotifyTarget[] {
  const seen = new Set<string>();
  const out: TeamContactNotifyTarget[] = [];
  for (const role of TEAM_CONTACT_ROLES) {
    const p = contacts[role];
    if (!p?.uid) continue;
    if (seen.has(p.uid)) continue;
    seen.add(p.uid);
    out.push({
      role,
      roleLabel: TEAM_CONTACT_ROLE_LABEL[role],
      uid: p.uid,
      name: p.name,
      phone: p.phone,
    });
  }
  return out;
}

/**
 * Resolve allocate notify recipients.
 * Primary: contacts with uid (회장·총무·감독). Guest teams: federations/.../guestTeams.
 * Fallback: reservationContact / fallbackUids / owner (single) — ops safety.
 */
export async function resolveTeamContactNotifyTargets(input: {
  teamId: string;
  federationSlug?: string;
  teamKind?: "platform" | "guest";
  fallbackUids?: Array<string | null | undefined>;
}): Promise<{
  targets: TeamContactNotifyTarget[];
  source: "contacts" | "fallback" | "none";
}> {
  const id = String(input.teamId || "").trim();
  if (!id) return { targets: [], source: "none" };

  // Guest team contacts
  if (input.federationSlug && input.teamKind === "guest") {
    try {
      const guestSnap = await getDoc(
        doc(db, "federations", input.federationSlug, "guestTeams", id)
      );
      if (guestSnap.exists()) {
        const contacts = parseTeamContacts(guestSnap.data()?.contacts);
        const fromContacts = listTeamContactNotifyTargets(contacts);
        // Include phone-only for denorm awareness (App push still filters uid)
        const phoneOnly: TeamContactNotifyTarget[] = [];
        const seen = new Set(fromContacts.map((t) => t.uid));
        for (const role of TEAM_CONTACT_ROLES) {
          const p = contacts[role];
          if (!p) continue;
          if (p.uid && seen.has(p.uid)) continue;
          if (p.uid) continue; // already in fromContacts
          if (!p.phone && !p.name) continue;
          phoneOnly.push({
            role,
            roleLabel: TEAM_CONTACT_ROLE_LABEL[role],
            uid: "",
            name: p.name,
            phone: p.phone,
          });
        }
        const all = [...fromContacts, ...phoneOnly];
        if (all.length > 0) return { targets: all, source: "contacts" };
      }
    } catch {
      /* ignore */
    }
  }

  const contacts = await getTeamContacts(id);
  const fromContacts = listTeamContactNotifyTargets(contacts);
  if (fromContacts.length > 0) {
    return { targets: fromContacts, source: "contacts" };
  }

  // Federation operating team → platformTeamId
  if (input.federationSlug) {
    try {
      const fedSnap = await getDoc(
        doc(db, "federations", input.federationSlug, "teams", id)
      );
      if (fedSnap.exists()) {
        const fd = fedSnap.data() as Record<string, unknown>;
        const fedContacts = parseTeamContacts(fd.contacts);
        const fromFed = listTeamContactNotifyTargets(fedContacts);
        if (fromFed.length > 0) return { targets: fromFed, source: "contacts" };
        const platformTeamId =
          typeof fd.platformTeamId === "string" ? fd.platformTeamId.trim() : "";
        if (platformTeamId) {
          const pc = await getTeamContacts(platformTeamId);
          const fromP = listTeamContactNotifyTargets(pc);
          if (fromP.length > 0) return { targets: fromP, source: "contacts" };
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Legacy reservationContact fallback
  try {
    const snap = await getDoc(doc(db, "teams", id));
    if (snap.exists()) {
      const d = snap.data() as Record<string, unknown>;
      const rc = d.reservationContact;
      if (rc && typeof rc === "object" && !Array.isArray(rc)) {
        const uid = typeof (rc as { uid?: unknown }).uid === "string"
          ? String((rc as { uid: string }).uid).trim()
          : "";
        if (uid) {
          return {
            targets: [
              {
                role: "manager",
                roleLabel: "예약담당",
                uid,
                name:
                  typeof (rc as { name?: unknown }).name === "string"
                    ? String((rc as { name: string }).name)
                    : "",
                phone:
                  typeof (rc as { phone?: unknown }).phone === "string"
                    ? String((rc as { phone: string }).phone)
                    : "",
              },
            ],
            source: "fallback",
          };
        }
      }
      for (const raw of input.fallbackUids || []) {
        const uid = typeof raw === "string" ? raw.trim() : "";
        if (uid) {
          return {
            targets: [
              {
                role: "manager",
                roleLabel: "담당",
                uid,
                name: "",
                phone: "",
              },
            ],
            source: "fallback",
          };
        }
      }
      const owner =
        (typeof d.ownerUid === "string" && d.ownerUid.trim()) ||
        (typeof d.ownerUserId === "string" && d.ownerUserId.trim()) ||
        (typeof d.ownerId === "string" && d.ownerId.trim()) ||
        "";
      if (owner) {
        return {
          targets: [
            {
              role: "chairman",
              roleLabel: "회장",
              uid: owner,
              name: "",
              phone: "",
            },
          ],
          source: "fallback",
        };
      }
    }
  } catch {
    /* ignore */
  }

  for (const raw of input.fallbackUids || []) {
    const uid = typeof raw === "string" ? raw.trim() : "";
    if (uid) {
      return {
        targets: [
          { role: "manager", roleLabel: "담당", uid, name: "", phone: "" },
        ],
        source: "fallback",
      };
    }
  }

  return { targets: [], source: "none" };
}

export type SetTeamContactsInput = {
  teamId: string;
  contacts: {
    chairman?: { name?: string; phone?: string; uid?: string } | null;
    manager?: { name?: string; phone?: string; uid?: string } | null;
    coach?: { name?: string; phone?: string; uid?: string } | null;
  };
};

export async function setTeamContacts(
  input: SetTeamContactsInput
): Promise<{ ok: true; contacts: TeamContacts }> {
  const callable = httpsCallable<
    SetTeamContactsInput,
    { ok: true; contacts: TeamContacts }
  >(functions, "setTeamContacts");
  const res = await callable(input);
  return res.data;
}
