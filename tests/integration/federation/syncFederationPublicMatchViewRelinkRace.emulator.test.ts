import { getApps, initializeApp } from "../../../functions/node_modules/firebase-admin/lib/app/index";
import { getFirestore } from "../../../functions/node_modules/firebase-admin/lib/firestore/index";
import { syncFederationPublicMatchView } from "../../../functions/src/federation/syncFederationPublicMatchView";

const PROJECT = "demo-matchops-1b-seta";
let sequence = 0;
jest.setTimeout(60_000);

function fixture() {
  const db = getFirestore();
  const matchId = `relink${++sequence}`;
  const tournament = db.doc("federations/fed/tournaments/cup");
  const match = tournament.collection("matches").doc(matchId);
  const home = tournament.collection("participants").doc(`home${matchId}`);
  const away = tournament.collection("participants").doc(`away${matchId}`);
  const club = db.collection("federations/fed/clubMatchProjections");
  const run = () => syncFederationPublicMatchView.run({ params: {
    federationId: "fed", tournamentId: "cup", matchId,
  } } as Parameters<typeof syncFederationPublicMatchView.run>[0]);
  const rows = async () => (await club.where("matchId", "==", matchId).get()).docs;
  return { db, matchId, tournament, match, home, away, club, run, rows };
}

async function seed(r: ReturnType<typeof fixture>) {
  await r.tournament.set({ tournamentName: "Cup" });
  await r.home.set({ linkStatus: "EXACT_LINKED", platformTeamId: "A", federationTeamId: "fA" });
  await r.away.set({ linkStatus: "EXACT_LINKED", platformTeamId: "Z", federationTeamId: "fZ" });
  await r.match.set({ federationId: "fed", tournamentId: "cup", status: "LIVE",
    homeScore: 1, awayScore: 0, homeTeamId: r.home.id, awayTeamId: r.away.id,
    homeTeamName: "A display", awayTeamName: "Z display", scheduledAt: "2026-09-14T10:00:00Z",
    isCanary: false, hiddenFromFieldHub: false });
  await r.run();
}

async function assertHome(r: ReturnType<typeof fixture>, expected: string, prior: string[]) {
  const rows = await r.rows();
  expect(rows.filter(row => row.data().visible).map(row => row.id).sort())
    .toEqual([`${expected}__${r.matchId}`, `Z__${r.matchId}`].sort());
  for (const id of prior) expect((await r.club.doc(`${id}__${r.matchId}`).get()).data()?.visible).toBe(false);
  expect(rows.map(row => row.id).sort())
    .toEqual([...new Set([...prior, expected, "Z"])].map(id => `${id}__${r.matchId}`).sort());
}

beforeAll(() => {
  if (process.env.SET_A_TEST_EMULATOR_ONLY !== "1") throw new Error("Relink race requires demo emulator");
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";
  process.env.GCLOUD_PROJECT = PROJECT;
  if (getApps().length === 0) initializeApp({ projectId: PROJECT });
});

describe("Set A controlled participant relink races", () => {
  it("A: A to B hides the stale row and retains only current exact-linked projections", async () => {
    const r = fixture(); await seed(r);
    await r.home.update({ platformTeamId: "B", federationTeamId: "fB" });
    await r.run(); await assertHome(r, "B", ["A"]);
  });

  it("B: a delayed old delivery overlaps a newer B delivery but reads current B", async () => {
    const r = fixture(); await seed(r);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const oldDelivery = (async () => { await gate; await r.run(); })();
    await r.home.update({ platformTeamId: "B", federationTeamId: "fB" });
    const newer = r.run(); release();
    await Promise.all([oldDelivery, newer]);
    await assertHome(r, "B", ["A"]);
  });

  it("C: A to B to C converges with B delivery racing C and a delayed A delivery", async () => {
    const r = fixture(); await seed(r);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const delayedA = (async () => { await gate; await r.run(); })();
    await r.home.update({ platformTeamId: "B", federationTeamId: "fB" });
    await r.run(); await assertHome(r, "B", ["A"]);
    const overlappingB = r.run();
    const changeToC = r.home.update({ platformTeamId: "C", federationTeamId: "fC" });
    await changeToC;
    const currentC = r.run(); release();
    await Promise.all([delayedA, overlappingB, currentC]);
    await assertHome(r, "C", ["A", "B"]);
  });

  it("C: both B and A deliveries can arrive after C without restoring either stale row", async () => {
    const r = fixture(); await seed(r);
    await r.home.update({ platformTeamId: "B", federationTeamId: "fB" });
    await r.run();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const delayedA = (async () => { await gate; await r.run(); })();
    const delayedB = (async () => { await gate; await r.run(); })();
    await r.home.update({ platformTeamId: "C", federationTeamId: "fC" });
    const currentC = r.run(); release();
    await Promise.all([delayedB, currentC, delayedA]);
    await assertHome(r, "C", ["A", "B"]);
  });

  it("D: identical concurrent retries preserve deterministic IDs, revision and projectedAt", async () => {
    const r = fixture(); await seed(r);
    const before = (await r.club.doc(`A__${r.matchId}`).get()).data()!;
    await Promise.all([r.run(), r.run()]);
    const after = (await r.club.doc(`A__${r.matchId}`).get()).data()!;
    expect(after.sourceRevision).toBe(before.sourceRevision);
    expect(after.projectedAt).toEqual(before.projectedAt);
    await assertHome(r, "A", []);
  });

  it("E: removing exact link hides A without name-derived fallback", async () => {
    const r = fixture(); await seed(r);
    await r.home.update({ linkStatus: "DISPLAY_ONLY", platformTeamId: "", federationTeamId: "" });
    await Promise.all([r.run(), r.run()]);
    const rows = await r.rows();
    expect(rows.map(row => row.id).sort()).toEqual([`A__${r.matchId}`, `Z__${r.matchId}`].sort());
    expect((await r.club.doc(`A__${r.matchId}`).get()).data()?.visible).toBe(false);
    expect((await r.club.doc(`Z__${r.matchId}`).get()).data()?.visible).toBe(true);
    expect((await r.match.get()).data()?.homeTeamName).toBe("A display");
  });
});
