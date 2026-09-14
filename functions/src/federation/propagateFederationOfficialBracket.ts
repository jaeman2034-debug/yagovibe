import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Transaction } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import {
  propagateFederationOfficialBracketCore,
  type BracketTransaction,
} from "./propagateFederationOfficialBracketCore";

/** Only this trigger writes a canonical dependent bracket slot. */
export const propagateFederationOfficialBracket = onDocumentUpdated(
  {
    document: "federations/{federationId}/tournaments/{tournamentId}/matches/{matchId}",
    region: "asia-northeast3",
  },
  async event => {
    const before = event.data?.before.data() ?? null;
    const after = event.data?.after.data() ?? null;
    if (before?.status === "OFFICIAL" || after?.status !== "OFFICIAL") return;
    const { federationId, tournamentId, matchId } = event.params;
    if (!getApps().some(app => app.name === "[DEFAULT]")) initializeApp();
    const db = getFirestore();
    const matchesRef = db.collection(
      `federations/${federationId}/tournaments/${tournamentId}/matches`,
    );
    const sourceRef = matchesRef.doc(matchId);
    const participantsRef = db.collection(
      `federations/${federationId}/tournaments/${tournamentId}/participants`,
    );
    const result = await propagateFederationOfficialBracketCore(
      { federationId, tournamentId, matchId, before, after },
      {
        runTransaction: body => db.runTransaction(async (tx: Transaction) => {
          const port: BracketTransaction = {
            getSource: async () => (await tx.get(sourceRef)).data() ?? null,
            getMatches: async () => (await tx.get(matchesRef)).docs.map(doc => ({
              id: doc.id, ...doc.data(),
            })),
            getTarget: async id => (await tx.get(matchesRef.doc(id))).data() ?? null,
            getParticipant: async id => (await tx.get(participantsRef.doc(id))).data() ?? null,
            getOfficialAudit: async id =>
              (await tx.get(sourceRef.collection("auditTrail").doc(id))).data() ?? null,
            getBracketAudit: async (targetId, id) =>
              (await tx.get(matchesRef.doc(targetId).collection("auditTrail").doc(id))).data() ?? null,
            updateTarget: (targetId, patch) => { tx.update(matchesRef.doc(targetId), patch); },
            createBracketAudit: (targetId, id, audit) => {
              tx.create(matchesRef.doc(targetId).collection("auditTrail").doc(id), audit);
            },
          };
          return body(port);
        }),
      },
    );
    if (result.outcome === "HOLD") {
      logger.warn("Canonical bracket propagation held", {
        federationId, tournamentId, matchId, reason: result.reason,
      });
    }
  },
);
