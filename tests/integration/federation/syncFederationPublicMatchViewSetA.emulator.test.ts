import { getApps, initializeApp } from "../../../functions/node_modules/firebase-admin/lib/app/index";
import { getFirestore } from "../../../functions/node_modules/firebase-admin/lib/firestore/index";
import { syncFederationPublicMatchView } from "../../../functions/src/federation/syncFederationPublicMatchView";

const PROJECT = "demo-matchops-1b-seta";
const FED = "fed";
const TID = "cup";
let sequence = 0;

function refs() {
  const db = getFirestore();
  const matchId = `m${++sequence}`;
  const tournament = db.doc(`federations/${FED}/tournaments/${TID}`);
  const match = tournament.collection("matches").doc(matchId);
  const publicDoc = tournament.collection("publicMatches").doc(matchId);
  const club = db.collection(`federations/${FED}/clubMatchProjections`);
  const participant = (id: string) => tournament.collection("participants").doc(id);
  const run = () => syncFederationPublicMatchView.run({ params: {
    federationId: FED, tournamentId: TID, matchId,
  } } as Parameters<typeof syncFederationPublicMatchView.run>[0]);
  return { db, matchId, tournament, match, publicDoc, club, participant, run };
}

async function seed(r: ReturnType<typeof refs>, flags: Record<string, unknown> = {}) {
  await r.tournament.set({ tournamentName: "Cup" });
  await r.participant("p1").set({ linkStatus: "EXACT_LINKED", platformTeamId: "X", federationTeamId: "fx" });
  await r.participant("p2").set({ linkStatus: "EXACT_LINKED", platformTeamId: "Z", federationTeamId: "fz" });
  await r.match.set({ federationId: FED, tournamentId: TID, status: "LIVE",
    homeScore: 1, awayScore: 0, homeTeamId: "p1", awayTeamId: "p2",
    homeTeamName: "Home", awayTeamName: "Away", scheduledAt: "2026-09-14T10:00:00Z",
    isCanary: false, hiddenFromFieldHub: false, ...flags });
}

beforeAll(() => {
  if (process.env.SET_A_TEST_EMULATOR_ONLY !== "1") {
    throw new Error("Set A integration test requires the named demo Firestore emulator");
  }
  // tests/setup.ts sets production project and port 8080; restore this demo-only fixture.
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";
  process.env.GCLOUD_PROJECT = PROJECT;
  if (getApps().length === 0) initializeApp({ projectId: PROJECT });
});

describe("Batch 1B Set A real Firestore transaction", () => {
  it("creates one public and two exact club docs without touching canonical or story", async () => {
    const r = refs(); await seed(r);
    const before = (await r.match.get()).data();
    await r.run();
    const pub = (await r.publicDoc.get()).data()!;
    const club = await r.club.where("matchId", "==", r.matchId).get();
    expect(pub).toMatchObject({ publicVisible: true, tournamentName: "Cup", homeScore: 1, awayScore: 0 });
    expect(club.docs.map(d => d.id).sort()).toEqual([`X__${r.matchId}`, `Z__${r.matchId}`]);
    expect(club.docs.every(d => d.data().visible === true)).toBe(true);
    expect(pub).not.toHaveProperty("publicStoryEvents");
    expect((await r.match.get()).data()).toEqual(before);
    expect((await r.match.collection("events").get()).empty).toBe(true);
    expect((await r.match.collection("auditTrail").get()).empty).toBe(true);
    expect((await r.db.collection(`federations/${FED}/clubTournamentNotices`).get()).empty).toBe(true);
  });

  it("hides on UNKNOWN, canary, hidden, and incomplete score without fake zeros", async () => {
    for (const patch of [
      { isCanary: null }, { hiddenFromFieldHub: null },
      { isCanary: true }, { hiddenFromFieldHub: true }, { homeScore: null },
    ]) {
      const r = refs(); await seed(r, patch);
      await r.run();
      expect((await r.publicDoc.get()).exists).toBe(false);
      expect((await r.club.where("matchId", "==", r.matchId).get()).empty).toBe(true);
    }
  });

  it("hides existing projections and keeps public story fields on visibility loss", async () => {
    const r = refs(); await seed(r); await r.run();
    await r.publicDoc.set({ publicStoryEvents: [{ publicSafeText: "safe" }] }, { merge: true });
    await r.match.update({ isCanary: true });
    await r.run();
    expect((await r.publicDoc.get()).data()).toMatchObject({ publicVisible: false,
      publicStoryEvents: [{ publicSafeText: "safe" }] });
    const rows = await r.club.where("matchId", "==", r.matchId).get();
    expect(rows.docs.every(d => d.data().visible === false)).toBe(true);
    expect(rows.size).toBe(2);
  });

  it("reconciles exact X to display-only and then to Y without extra docs", async () => {
    const r = refs(); await seed(r); await r.run();
    await r.participant("p1").update({ linkStatus: "DISPLAY_ONLY" });
    await r.run();
    expect((await r.club.doc(`X__${r.matchId}`).get()).data()?.visible).toBe(false);
    await r.participant("p1").update({ linkStatus: "EXACT_LINKED", platformTeamId: "Y" });
    await r.run();
    expect((await r.club.doc(`Y__${r.matchId}`).get()).data()?.visible).toBe(true);
    expect((await r.club.doc(`X__${r.matchId}`).get()).data()?.visible).toBe(false);
    expect((await r.club.where("matchId", "==", r.matchId).get()).size).toBe(3);
  });

  it("source delete hides existing docs and creates no new hide-only docs", async () => {
    const r = refs(); await seed(r); await r.run();
    await r.publicDoc.set({ publicStoryEvents: [{ publicSafeText: "safe" }] }, { merge: true });
    await r.match.delete();
    await r.run();
    expect((await r.publicDoc.get()).data()).toMatchObject({ publicVisible: false,
      publicStoryEvents: [{ publicSafeText: "safe" }] });
    expect((await r.club.where("matchId", "==", r.matchId).get()).docs.every(d => d.data().visible === false)).toBe(true);
    const empty = refs(); await empty.run();
    expect((await empty.publicDoc.get()).exists).toBe(false);
    expect((await empty.club.where("matchId", "==", empty.matchId).get()).empty).toBe(true);
  });

  it("identical and limited concurrent retries preserve document counts, revision, and projectedAt", async () => {
    const r = refs(); await seed(r); await r.run();
    const firstPub = (await r.publicDoc.get()).data()!;
    const firstClub = (await r.club.doc(`X__${r.matchId}`).get()).data()!;
    await r.run();
    await Promise.all([r.run(), r.run()]);
    const finalPub = (await r.publicDoc.get()).data()!;
    const finalClub = (await r.club.doc(`X__${r.matchId}`).get()).data()!;
    expect(finalPub).toEqual(firstPub);
    expect(finalClub).toEqual(firstClub);
    expect(finalClub.sourceRevision).toBe(firstClub.sourceRevision);
    expect((await r.club.where("matchId", "==", r.matchId).get()).size).toBe(2);
  });

  it("two concurrent initial deliveries converge, then a real score change updates revision once", async () => {
    const r = refs(); await seed(r);
    await Promise.all([r.run(), r.run()]);
    expect((await r.publicDoc.get()).data()).toMatchObject({ publicVisible: true, homeScore: 1 });
    expect((await r.club.where("matchId", "==", r.matchId).get()).size).toBe(2);
    const before = (await r.club.doc(`X__${r.matchId}`).get()).data()!;
    await r.match.update({ homeScore: 2 });
    await r.run();
    const after = (await r.club.doc(`X__${r.matchId}`).get()).data()!;
    expect(after.sourceRevision).not.toBe(before.sourceRevision);
    expect(after.teamScore).toBe(2);
    expect((await r.publicDoc.get()).data()?.homeScore).toBe(2);
    expect((await r.club.where("matchId", "==", r.matchId).get()).size).toBe(2);
  });
});
