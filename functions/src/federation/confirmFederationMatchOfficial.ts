import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Transaction } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { confirmFederationMatchOfficialCore, OfficialError, type OfficialTransaction } from "./confirmFederationMatchOfficialCore";

const segment = (value: unknown): string => {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,120}$/.test(value)) {
    throw new HttpsError("invalid-argument", "Invalid canonical match identifier");
  }
  return value;
};

export const confirmFederationMatchOfficial = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Authentication required");
  const federationId = segment(request.data?.federationId);
  const tournamentId = segment(request.data?.tournamentId);
  const matchId = segment(request.data?.matchId);
  if (getApps().length === 0) initializeApp();
  const db = getFirestore();
  const federationRef = db.doc(`federations/${federationId}`);
  const tournamentRef = federationRef.collection("tournaments").doc(tournamentId);
  const matchRef = tournamentRef.collection("matches").doc(matchId);
  const eventsRef = matchRef.collection("events");
  const participantsRef = tournamentRef.collection("participants");

  try {
    return await confirmFederationMatchOfficialCore({ federationId, tournamentId, matchId, actorUid: uid }, {
      runTransaction: body => db.runTransaction(async (tx: Transaction) => {
        const port: OfficialTransaction = {
          getFederation: async () => (await tx.get(federationRef)).data() ?? null,
          getMatch: async () => (await tx.get(matchRef)).data() ?? null,
          getEvents: async () => (await tx.get(eventsRef)).docs.map(s => ({ id: s.id, ...s.data() })),
          getParticipant: async id => (await tx.get(participantsRef.doc(id))).data() ?? null,
          getTournamentMatches: async () => (await tx.get(tournamentRef.collection("matches"))).docs.map(s => ({ id: s.id, ...s.data() })),
          getAudit: async id => (await tx.get(matchRef.collection("auditTrail").doc(id))).data() ?? null,
          updateMatch: patch => { tx.update(matchRef, patch); },
          createAudit: (id, audit) => { tx.create(matchRef.collection("auditTrail").doc(id), audit); },
        };
        return body(port);
      }),
    });
  } catch (error) {
    if (error instanceof OfficialError) throw new HttpsError(error.code, error.message);
    throw error;
  }
});
