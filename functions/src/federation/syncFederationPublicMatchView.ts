import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { parseFederationMatch } from "../shared/federation/matchOps/federationMatchOpsFirestore";
import type { ProjectionIdentity } from "../shared/federation/publicProjection/canonicalProjectionContract";
import { planSetA, type ClubRow } from "./syncFederationPublicMatchViewCore";
import { syncStoryFromCanonical } from "./syncFederationPublicMatchStoryOnEvent";

const segment = (value: string): string => {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(value)) throw new Error("Invalid projection path segment");
  return value;
};

function participant(id: string | null, raw: Record<string, unknown> | undefined): ProjectionIdentity {
  if (!id || !raw) return null;
  return {
    id,
    linkStatus: raw.linkStatus === "EXACT_LINKED" ? "EXACT_LINKED" : "DISPLAY_ONLY",
    platformTeamId: typeof raw.platformTeamId === "string" ? raw.platformTeamId : "",
    federationTeamId: typeof raw.federationTeamId === "string" ? raw.federationTeamId : "",
  };
}

/** Local Set A wrapper. The existing entry still binds the deferred story name to this path. */
export const syncFederationPublicMatchView = onDocumentWritten({
  document: "federations/{federationId}/tournaments/{tournamentId}/matches/{matchId}",
  region: "asia-northeast3",
  maxInstances: 20,
}, async event => {
  const federationId = segment(event.params.federationId);
  const tournamentId = segment(event.params.tournamentId);
  const matchId = segment(event.params.matchId);
  if (getApps().length === 0) initializeApp();
  const db = getFirestore();
  const tournamentRef = db.doc(`federations/${federationId}/tournaments/${tournamentId}`);
  const matchRef = tournamentRef.collection("matches").doc(matchId);
  const publicRef = tournamentRef.collection("publicMatches").doc(matchId);
  const clubCollection = db.collection(`federations/${federationId}/clubMatchProjections`);
  await db.runTransaction(async tx => {
    // All Firestore reads precede every write, including the single-field stale query.
    const matchSnap = await tx.get(matchRef);
    const match = matchSnap.exists ? parseFederationMatch(matchId, matchSnap.data() ?? {}) : null;
    const tournamentSnap = await tx.get(tournamentRef);
    const homeSnap = match?.homeTeamId ? await tx.get(tournamentRef.collection("participants").doc(segment(match.homeTeamId))) : null;
    const awaySnap = match?.awayTeamId ? await tx.get(tournamentRef.collection("participants").doc(segment(match.awayTeamId))) : null;
    const publicSnap = await tx.get(publicRef);
    const clubSnap = await tx.get(clubCollection.where("matchId", "==", matchId));
    const clubRows: ClubRow[] = clubSnap.docs.map(s => ({
      id: s.id, matchId: String(s.data().matchId ?? ""),
      platformTeamId: String(s.data().platformTeamId ?? ""), data: s.data(),
    }));
    const tournamentRaw = tournamentSnap.data();
    const tournamentName = typeof tournamentRaw?.tournamentName === "string" && tournamentRaw.tournamentName.trim() ?
      tournamentRaw.tournamentName : typeof tournamentRaw?.name === "string" && tournamentRaw.name.trim() ? tournamentRaw.name : null;
    const plan = planSetA({ federationId, tournamentId, matchId, match, tournamentName,
      home: participant(match?.homeTeamId ?? null, homeSnap?.data()),
      away: participant(match?.awayTeamId ?? null, awaySnap?.data()),
      publicRow: publicSnap.data() ?? null, clubRows });
    for (const write of plan.writes) tx.set(db.doc(write.path), { ...write.patch, projectedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  // Reconcile events that arrived before the public document was created.
  await syncStoryFromCanonical(db, federationId, tournamentId, matchId);
});
