/** Batch 1A contract: exercise the committed rules through client SDKs only. */
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously } from "firebase/auth";
import {
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getFirestore,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

const projectId = "demo-matchops-1a";
const firestoreBase = `http://127.0.0.1:8081/v1/projects/${projectId}/databases/(default)/documents`;
let sequence = 0;
const apps: FirebaseApp[] = [];

function uniqueId() {
  return `batch1a_${Date.now()}_${++sequence}`;
}

async function client(): Promise<{ db: Firestore; uid: string }> {
  const app = initializeApp(
    { apiKey: "demo-key", authDomain: `${projectId}.firebaseapp.com`, projectId },
    uniqueId()
  );
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8081);
  const user = await signInAnonymously(auth);
  return { db, uid: user.user.uid };
}

/** Emulator-only fixture setup; the `owner` token must never be used for assertions. */
async function seed(path: string, fields: Record<string, unknown>) {
  const encoded = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      typeof value === "number"
        ? { integerValue: String(value) }
        : typeof value === "boolean"
          ? { booleanValue: value }
          : { stringValue: String(value) },
    ])
  );
  const response = await fetch(`${firestoreBase}/${path}`, {
    method: "PATCH",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encoded }),
  });
  if (!response.ok) throw new Error(`Emulator fixture failed: HTTP ${response.status}`);
}

async function fixture() {
  const manager = await client();
  const fed = uniqueId();
  const tournament = uniqueId();
  const match = uniqueId();
  await seed(`federations/${fed}`, { ownerUid: manager.uid, ownerId: manager.uid });
  await seed(`federations/${fed}/tournaments/${tournament}/matches/${match}`, {
    federationId: fed,
    tournamentId: tournament,
    status: "REVIEW_REQUIRED",
    homeTeamName: "Home",
    awayTeamName: "Away",
    homeScore: 1,
    awayScore: 0,
    scheduledAt: "2026-09-14T10:00:00Z",
  });
  return { ...manager, fed, tournament, match };
}

const denied = async (operation: Promise<unknown>) => {
  await expect(operation).rejects.toMatchObject({ code: "permission-denied" });
};

afterAll(async () => {
  await Promise.all(apps.map(deleteApp));
});

describe("Batch 1A canonical MatchOps rules", () => {
  it("manager cannot use the federation catch-all for an arbitrary canonical match write", async () => {
    const { db, fed, tournament, match } = await fixture();
    await denied(updateDoc(doc(db, "federations", fed, "tournaments", tournament, "matches", match), {
      homeScore: 99,
      arbitraryBypass: true,
    }));
  });

  it("a client cannot transition a match to OFFICIAL", async () => {
    const { db, fed, tournament, match } = await fixture();
    await denied(updateDoc(doc(db, "federations", fed, "tournaments", tournament, "matches", match), {
      status: "OFFICIAL",
    }));
  });

  it("permits only a manager's bounded pre-OFFICIAL score and event edits", async () => {
    const { db, uid, fed, tournament, match } = await fixture();
    const base = `federations/${fed}/tournaments/${tournament}/matches/${match}`;
    await expect(updateDoc(doc(db, base), { homeScore: 2 })).resolves.toBeUndefined();
    await expect(setDoc(doc(db, `${base}/events/${uniqueId()}`), {
      type: "GOAL", source: "MANUAL", status: "CONFIRMED", teamSide: "home",
      recordedBy: uid, recordedAt: "2026-09-14T10:15:00Z",
    })).resolves.toBeUndefined();
    await denied(updateDoc(doc(db, base), { bracketDependencyResolved: true }));
    await denied(setDoc(doc(db, `${base}/auditTrail/${uniqueId()}`), {
      action: "RESULT_OFFICIAL", actorUid: uid,
    }));
  });

  it("rejects non-manager writes and unknown match descendants", async () => {
    const { fed, tournament, match } = await fixture();
    const outsider = await client();
    const base = `federations/${fed}/tournaments/${tournament}/matches/${match}`;
    await denied(updateDoc(doc(outsider.db, base), { homeScore: 3 }));
    await denied(setDoc(doc(outsider.db, `${base}/events/${uniqueId()}`), {
      type: "GOAL", source: "MANUAL", status: "CONFIRMED",
      recordedBy: outsider.uid, recordedAt: "2026-09-14T10:15:00Z",
    }));
    await denied(setDoc(doc(outsider.db, `${base}/private/${uniqueId()}`), { status: "OFFICIAL" }));
  });

  it("an OFFICIAL match cannot be updated or deleted by a manager", async () => {
    const { db, fed, tournament, match } = await fixture();
    const path = `federations/${fed}/tournaments/${tournament}/matches/${match}`;
    await seed(path, { status: "OFFICIAL", federationId: fed, tournamentId: tournament });
    const ref = doc(db, path);
    await denied(updateDoc(ref, { homeScore: 42 }));
    await denied(deleteDoc(ref));
  });

  it("blocks forbidden writes to events, auditTrail and revisions", async () => {
    const { db, fed, tournament, match } = await fixture();
    const base = `federations/${fed}/tournaments/${tournament}/matches/${match}`;
    await seed(base, { status: "OFFICIAL", federationId: fed, tournamentId: tournament });
    await denied(setDoc(doc(db, `${base}/events/${uniqueId()}`), { type: "GOAL", recordedBy: "forged" }));
    await seed(`${base}/auditTrail/a1`, { action: "RESULT_OFFICIAL", actorUid: "system" });
    await denied(updateDoc(doc(db, `${base}/auditTrail/a1`), { action: "FORGED" }));
    await denied(deleteDoc(doc(db, `${base}/auditTrail/a1`)));
    await seed(`${base}/revisions/r1`, { reason: "review" });
    await denied(deleteDoc(doc(db, `${base}/revisions/r1`)));
  });

  it("keeps Batch 1D root and league legacy match writes frozen", async () => {
    const { db, fed, tournament } = await fixture();
    await denied(setDoc(doc(db, "federations", fed, "matches", uniqueId()), { status: "scheduled" }));
    await denied(setDoc(doc(db, "federations", fed, "leagues", tournament, "matches", uniqueId()), {
      status: "scheduled",
    }));
  });

  it("preserves tournament document and unrelated subcollection writes", async () => {
    const { db, fed, tournament } = await fixture();
    await expect(setDoc(doc(db, "federations", fed, "tournaments", tournament), { name: "Cup" })).resolves.toBeUndefined();
    await expect(setDoc(doc(db, "federations", fed, "tournaments", tournament, "notes", uniqueId()), {
      text: "unrelated",
    })).resolves.toBeUndefined();
  });
});
