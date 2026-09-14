import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { buildPublicMatchStoryProjection } from "./buildPublicMatchStoryProjection";
import { planStoryPatch } from "./syncFederationPublicMatchStoryOnEventCore";
import type { CanonicalStoryEventInput } from "./publicMatchStoryTypes";

const segment = (value: string): string => {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(value)) throw new Error("Invalid story path segment");
  return value;
};

/** Story fields only. Missing public documents are never created by the event trigger. */
export async function syncStoryFromCanonical(db: Firestore, fedSlug: string, tournamentId: string, matchId: string): Promise<"WRITTEN" | "NO_OP" | "PUBLIC_MISSING" | "MATCH_MISSING"> {
  const tournament = db.doc(`federations/${segment(fedSlug)}/tournaments/${segment(tournamentId)}`);
  const match = tournament.collection("matches").doc(segment(matchId));
  const publicMatch = tournament.collection("publicMatches").doc(matchId);
  return db.runTransaction(async tx => {
    const matchSnap = await tx.get(match);
    if (!matchSnap.exists) return "MATCH_MISSING";
    const eventSnaps = await tx.get(match.collection("events").where("status", "==", "CONFIRMED"));
    const publicSnap = await tx.get(publicMatch);
    if (!publicSnap.exists) return "PUBLIC_MISSING";
    const inputs: CanonicalStoryEventInput[] = eventSnaps.docs.map(snap => {
      const row = snap.data();
      return { eventId: snap.id, type: row.type, status: row.status, teamSide: row.teamSide,
        minute: row.minute, playerName: row.playerName, privacyState: "UNKNOWN" };
    });
    const built = buildPublicMatchStoryProjection(inputs);
    const patch = planStoryPatch(publicSnap.data() ?? {}, built);
    if (!patch) return "NO_OP";
    tx.set(publicMatch, { ...patch, storyUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return "WRITTEN";
  });
}

/** Legacy-compatible local trigger config; deployed trigger metadata is not yet verified. */
export const syncFederationPublicMatchStoryOnEvent = onDocumentWritten({
  document: "federations/{fedSlug}/tournaments/{tournamentId}/matches/{matchId}/events/{eventId}",
  region: "asia-northeast3", maxInstances: 20,
}, async event => {
  if (getApps().length === 0) initializeApp();
  const result = await syncStoryFromCanonical(getFirestore(), event.params.fedSlug,
    event.params.tournamentId, event.params.matchId);
  if (result === "PUBLIC_MISSING") {
    // A subsequent Set A create does not replay this event; reconciliation remains required.
    console.warn("story_public_projection_missing", { matchId: event.params.matchId });
  }
});
