/**
 * PR4 — Team reservation contact (대관 예약 담당자 1명).
 * SoT: teams/{teamId}.reservationContact
 */

import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";

export type TeamReservationContact = {
  name: string;
  phone: string;
  email: string;
  uid: string;
  fcmToken: string | null;
  smsEnabled: boolean;
  kakaoEnabled: boolean;
  appNotificationEnabled: boolean;
};

export function parseReservationContact(
  raw: unknown
): TeamReservationContact | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  const uid = typeof d.uid === "string" ? d.uid.trim() : "";
  if (!uid) return null;
  return {
    name: typeof d.name === "string" ? d.name.trim() : "",
    phone: typeof d.phone === "string" ? d.phone.trim() : "",
    email: typeof d.email === "string" ? d.email.trim() : "",
    uid,
    fcmToken: typeof d.fcmToken === "string" ? d.fcmToken : null,
    smsEnabled: d.smsEnabled === true,
    kakaoEnabled: d.kakaoEnabled === true,
    appNotificationEnabled: d.appNotificationEnabled !== false,
  };
}

export async function getTeamReservationContact(
  teamId: string
): Promise<TeamReservationContact | null> {
  const id = String(teamId || "").trim();
  if (!id) return null;
  const snap = await getDoc(doc(db, "teams", id));
  if (!snap.exists()) return null;
  return parseReservationContact(snap.data()?.reservationContact);
}

/**
 * Resolve who receives reservation assignment / payment messages.
 * Priority: reservationContact.uid → fallbackUids (non-empty) → team owner.
 * Never prefers federation admin over club contact when contact exists.
 */
export async function resolveReservationNotifyUid(input: {
  teamId: string;
  fallbackUids?: Array<string | null | undefined>;
}): Promise<{
  uid: string | null;
  source: "reservationContact" | "fallback" | "owner" | "none";
  contact: TeamReservationContact | null;
}> {
  const contact = await getTeamReservationContact(input.teamId);
  if (contact?.uid && contact.appNotificationEnabled !== false) {
    return { uid: contact.uid, source: "reservationContact", contact };
  }

  for (const raw of input.fallbackUids || []) {
    const uid = typeof raw === "string" ? raw.trim() : "";
    if (uid) return { uid, source: "fallback", contact };
  }

  try {
    const snap = await getDoc(doc(db, "teams", input.teamId));
    if (snap.exists()) {
      const d = snap.data() as Record<string, unknown>;
      const owner =
        (typeof d.ownerUid === "string" && d.ownerUid.trim()) ||
        (typeof d.ownerUserId === "string" && d.ownerUserId.trim()) ||
        (typeof d.ownerId === "string" && d.ownerId.trim()) ||
        "";
      if (owner) return { uid: owner, source: "owner", contact };
    }
  } catch {
    /* ignore */
  }

  return { uid: null, source: "none", contact };
}

export type SetTeamReservationContactInput = {
  teamId: string;
  name?: string;
  phone?: string;
  email?: string;
  uid: string;
  smsEnabled?: boolean;
  kakaoEnabled?: boolean;
  appNotificationEnabled?: boolean;
  clear?: boolean;
};

export async function setTeamReservationContact(
  input: SetTeamReservationContactInput
): Promise<{ ok: true; reservationContact: TeamReservationContact | null }> {
  const callable = httpsCallable<
    SetTeamReservationContactInput,
    { ok: true; reservationContact: TeamReservationContact | null }
  >(functions, "setTeamReservationContact");
  const res = await callable(input);
  return res.data;
}
