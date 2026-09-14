import { getApps, initializeApp } from "../../../functions/node_modules/firebase-admin/lib/app/index";
import { getFirestore } from "../../../functions/node_modules/firebase-admin/lib/firestore/index";
import { syncStoryFromCanonical } from "../../../functions/src/federation/syncFederationPublicMatchStoryOnEvent";

const PROJECT = "demo-matchops-1b-seta";
let sequence = 0;
function fixture() {
  const db = getFirestore();
  const matchId = `story${++sequence}`;
  const tournament = db.doc("federations/fed/tournaments/cup");
  const match = tournament.collection("matches").doc(matchId);
  const publicDoc = tournament.collection("publicMatches").doc(matchId);
  const event = match.collection("events").doc("e1");
  return { db, match, publicDoc, event, run: () => syncStoryFromCanonical(db, "fed", "cup", matchId) };
}

beforeAll(() => {
  if (process.env.SET_A_TEST_EMULATOR_ONLY !== "1") throw new Error("Story integration requires demo emulator");
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";
  process.env.GCLOUD_PROJECT = PROJECT;
  if (getApps().length === 0) initializeApp({ projectId: PROJECT });
});

describe("Batch 1B story-only Firestore transaction", () => {
  it("never creates a story-only public document", async () => {
    const r = fixture();
    await r.match.set({ status: "LIVE" });
    await r.event.set({ status: "CONFIRMED", type: "GOAL", teamSide: "home", minute: 12, playerName: "홍길동" });
    expect(await r.run()).toBe("PUBLIC_MISSING");
    expect((await r.publicDoc.get()).exists).toBe(false);
  });

  it("writes only story fields, retries without timestamp change, then removes revoked event", async () => {
    const r = fixture();
    await r.match.set({ status: "LIVE" });
    await r.publicDoc.set({ publicVisible: true, homeScore: 2, publicStatus: "LIVE", tournamentName: "Cup" });
    await r.event.set({ status: "CONFIRMED", type: "GOAL", teamSide: "home", minute: 12,
      playerName: "홍길동", rawText: "private data", description: "private data" });
    expect(await r.run()).toBe("WRITTEN");
    const first = (await r.publicDoc.get()).data()!;
    expect(first).toMatchObject({ publicVisible: true, homeScore: 2, publicStatus: "LIVE", tournamentName: "Cup" });
    expect(first.publicStoryEvents).toMatchObject([{ eventId: "e1", publicSafeText: "12분 홈팀 득점", maskedPlayerName: null }]);
    expect(JSON.stringify(first.publicStoryEvents)).not.toContain("홍");
    expect(JSON.stringify(first.publicStoryEvents)).not.toContain("private data");
    expect(await r.run()).toBe("NO_OP");
    expect((await r.publicDoc.get()).data()).toEqual(first);
    await r.event.update({ status: "PENDING" });
    expect(await r.run()).toBe("WRITTEN");
    const empty = (await r.publicDoc.get()).data()!;
    expect(empty.publicStoryEvents).toEqual([]);
    expect(empty.storyRevision).not.toBe(first.storyRevision);
    expect(empty.publicVisible).toBe(true);
    expect(empty.homeScore).toBe(2);
    expect((await r.match.get()).data()).toEqual({ status: "LIVE" });
    expect((await r.db.collection("federations/fed/clubMatchProjections").where("matchId", "==", r.match.id).get()).empty).toBe(true);
    expect((await r.db.collection("federations/fed/clubTournamentNotices").get()).empty).toBe(true);
  });
});
