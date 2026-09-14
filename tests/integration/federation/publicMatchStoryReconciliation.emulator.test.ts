import { getApps, initializeApp } from "../../../functions/node_modules/firebase-admin/lib/app/index";
import { getFirestore } from "../../../functions/node_modules/firebase-admin/lib/firestore/index";
import { syncFederationPublicMatchView } from "../../../functions/src/federation/syncFederationPublicMatchView";
import { syncStoryFromCanonical } from "../../../functions/src/federation/syncFederationPublicMatchStoryOnEvent";

const PROJECT = "demo-matchops-1b-seta";
let sequence = 0;

function fixture() {
  const db = getFirestore();
  const matchId = `reconcile${++sequence}`;
  const tournament = db.doc("federations/fed/tournaments/cup");
  const match = tournament.collection("matches").doc(matchId);
  const publicDoc = tournament.collection("publicMatches").doc(matchId);
  const event = match.collection("events").doc("e1");
  const setA = () => syncFederationPublicMatchView.run({ params: {
    federationId: "fed", tournamentId: "cup", matchId,
  } } as Parameters<typeof syncFederationPublicMatchView.run>[0]);
  const story = () => syncStoryFromCanonical(db, "fed", "cup", matchId);
  return { db, tournament, match, publicDoc, event, setA, story };
}

async function seed(r: ReturnType<typeof fixture>, hidden = false) {
  await r.tournament.set({ tournamentName: "Cup" });
  await r.match.set({ federationId: "fed", tournamentId: "cup", status: "LIVE",
    homeScore: 1, awayScore: 0, homeTeamId: "p1", awayTeamId: "p2",
    homeTeamName: "Home", awayTeamName: "Away", scheduledAt: "2026-09-14T10:00:00Z",
    isCanary: false, hiddenFromFieldHub: hidden });
}

async function confirmed(r: ReturnType<typeof fixture>) {
  await r.event.set({ status: "CONFIRMED", type: "GOAL", teamSide: "home", minute: 12,
    playerName: "Private Name", rawText: "private raw text" });
}

beforeAll(() => {
  if (process.env.SET_A_TEST_EMULATOR_ONLY !== "1") throw new Error("Reconciliation requires demo emulator");
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";
  process.env.GCLOUD_PROJECT = PROJECT;
  if (getApps().length === 0) initializeApp({ projectId: PROJECT });
});

describe("Set A to Story missing-public reconciliation", () => {
  it("A: event first returns PUBLIC_MISSING, then Set A creates public and restores story", async () => {
    const r = fixture(); await seed(r); await confirmed(r);
    expect(await r.story()).toBe("PUBLIC_MISSING");
    expect((await r.publicDoc.get()).exists).toBe(false);
    await r.setA();
    const row = (await r.publicDoc.get()).data()!;
    expect(row.publicStoryEvents).toMatchObject([{ eventId: "e1", publicSafeText: "12분 홈팀 득점" }]);
    expect(JSON.stringify(row.publicStoryEvents)).not.toContain("Private");
    expect(JSON.stringify(row.publicStoryEvents)).not.toContain("raw text");
  });

  it("B: public first then event trigger writes the same story", async () => {
    const r = fixture(); await seed(r); await r.setA(); await confirmed(r);
    expect(await r.story()).toBe("WRITTEN");
    expect((await r.publicDoc.get()).data()?.publicStoryEvents).toMatchObject([{ eventId: "e1" }]);
  });

  it("C: both deterministic orders converge on one revision and a duplicate delivery is a no-op", async () => {
    const early = fixture(); await seed(early); await confirmed(early);
    expect(await early.story()).toBe("PUBLIC_MISSING"); await early.setA();
    const late = fixture(); await seed(late); await late.setA(); await confirmed(late);
    expect(await late.story()).toBe("WRITTEN");
    const first = (await early.publicDoc.get()).data()!;
    const second = (await late.publicDoc.get()).data()!;
    expect(first.publicStoryEvents).toEqual(second.publicStoryEvents);
    expect(first.storyRevision).toBe(second.storyRevision);
    await early.setA();
    expect((await early.publicDoc.get()).data()?.storyUpdatedAt).toEqual(first.storyUpdatedAt);
    expect(await early.story()).toBe("NO_OP");
  });

  it("D: hidden public becomes visible and Set A reconciles its existing event", async () => {
    const r = fixture(); await seed(r, true); await confirmed(r);
    await r.setA(); expect((await r.publicDoc.get()).exists).toBe(false);
    await r.match.update({ hiddenFromFieldHub: false }); await r.setA();
    expect((await r.publicDoc.get()).data()).toMatchObject({ publicVisible: true,
      publicStoryEvents: [{ eventId: "e1", type: "GOAL", minute: 12, teamSide: "home",
        publicSafeText: "12분 홈팀 득점", period: "FIRST_HALF", maskedPlayerName: null }] });
  });

  it("E: unconfirmed or deleted events before public creation leave no story events", async () => {
    for (const remove of [false, true]) {
      const r = fixture(); await seed(r); await confirmed(r);
      expect(await r.story()).toBe("PUBLIC_MISSING");
      if (remove) await r.event.delete(); else await r.event.update({ status: "PENDING" });
      await r.setA();
      expect((await r.publicDoc.get()).data()?.publicStoryEvents ?? []).toEqual([]);
    }
  });

  it("concurrent event delivery and Set A reconciliation converge without another story write", async () => {
    const r = fixture(); await seed(r); await r.setA(); await confirmed(r);
    await Promise.all([r.story(), r.setA(), r.story()]);
    const first = (await r.publicDoc.get()).data()!;
    expect(first.publicStoryEvents).toMatchObject([{ eventId: "e1" }]);
    await Promise.all([r.story(), r.setA()]);
    const second = (await r.publicDoc.get()).data()!;
    expect(second.storyRevision).toBe(first.storyRevision);
    expect(second.storyUpdatedAt).toEqual(first.storyUpdatedAt);
    expect(second.publicStoryEvents).toEqual(first.publicStoryEvents);
  });
});
