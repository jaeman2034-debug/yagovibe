/**
 * 동일 postId + 동일 거래 상대(두 UID)인 `chats` 문서가 여러 개일 때,
 * 메시지를 한 방(우선 canonical chatId, 없으면 lastMessageAt 최신)으로 합칩니다.
 *
 * 실행 (기본은 드라이런, 실제 쓰기는 --apply):
 *   cd functions
 *   npx tsx scripts/mergeDuplicateTradeChats.ts --postId=YOUR_POST_ID
 *   npx tsx scripts/mergeDuplicateTradeChats.ts --postId=YOUR_POST_ID --apply
 *
 * 프로덕션 Firestore가 기본입니다. 셸에 FIRESTORE_EMULATOR_HOST 가 남아 있으면(EINTR 없이 8210 거부 등)
 * 스크립트 시작 시 자동 제거합니다. 에뮬만 쓸 때는 `--use-emulator` 를 주세요.
 *
 * 필요: serviceAccountKey.json (functions 상위) 또는 gcloud 기본 자격증명
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
} from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

function parseArgs() {
  const raw = process.argv.slice(2);
  const apply = raw.includes("--apply");
  const useEmulator = raw.includes("--use-emulator");
  let postId = "";
  for (const a of raw) {
    if (a.startsWith("--postId=")) postId = a.slice("--postId=".length).trim();
  }
  return { apply, postId, useEmulator };
}

/** Admin SDK는 FIRESTORE_EMULATOR_HOST 가 있으면 로컬로 붙음 — 에뮬 미실행 시 ECONNREFUSED */
function prepareFirestoreConnection(useEmulator: boolean): void {
  if (useEmulator) {
    console.log("📍 Firestore 에뮬레이터 (--use-emulator)");
    return;
  }
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (host) {
    console.log(`📍 FIRESTORE_EMULATOR_HOST 제거 (${host}) → 프로덕션 Firestore`);
  }
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
}

const CLI = parseArgs();
prepareFirestoreConnection(CLI.useEmulator);

if (getApps().length === 0) {
  const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log(`Firebase Admin OK (project: ${serviceAccount.project_id})`);
  } else {
    initializeApp();
    console.log("Firebase Admin OK (default credentials)");
  }
}

const db = getFirestore();

function buildChatId(postId: string, participantA: string, participantB: string): string {
  const pid = String(postId ?? "").trim();
  const a = String(participantA ?? "").trim();
  const b = String(participantB ?? "").trim();
  if (!pid || !a || !b || a === b) throw new Error("buildChatId: invalid args");
  const [u1, u2] = a.localeCompare(b) <= 0 ? [a, b] : [b, a];
  return `${pid}_${u1}_${u2}`;
}

function participantSortedPair(data: DocumentData): [string, string] | null {
  const s = String(data.sellerId ?? "").trim();
  const b = String(data.buyerId ?? "").trim();
  if (s && b && s !== b) {
    return s.localeCompare(b) <= 0 ? [s, b] : [b, s];
  }
  const raw = Array.isArray(data.participants)
    ? data.participants
    : Array.isArray(data.users)
      ? data.users
      : [];
  const uniq = [...new Set(raw.map((x: unknown) => String(x).trim()).filter(Boolean))];
  if (uniq.length !== 2) return null;
  uniq.sort((x, y) => x.localeCompare(y));
  return [uniq[0]!, uniq[1]!];
}

function tsMillis(v: unknown): number {
  if (v instanceof Timestamp) {
    const ms = v.toMillis();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    try {
      const ms = (v as { toMillis: () => number }).toMillis();
      return Number.isFinite(ms) ? ms : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

function lastActivityMillis(data: DocumentData): number {
  const lm = tsMillis(data.lastMessageAt);
  if (lm > 0) return lm;
  return tsMillis(data.createdAt);
}

function msgFingerprint(data: DocumentData): string {
  const sender = String(data.senderId ?? data.uid ?? data.userId ?? "").trim();
  const text = String(data.text ?? "").slice(0, 240);
  const typ = String(data.type ?? "");
  return `${tsMillis(data.createdAt)}|${sender}|${typ}|${text}`;
}

function sanitizeCopyPayload(data: DocumentData): DocumentData {
  const out: DocumentData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function resolveListingOwnerUid(postId: string): Promise<string | null> {
  const pid = String(postId ?? "").trim();
  if (!pid) return null;
  const cols = ["marketPosts", "market", "marketProducts"] as const;
  let fallback: string | null = null;
  for (const col of cols) {
    try {
      const snap = await db.collection(col).doc(pid).get();
      if (!snap.exists) continue;
      const d = snap.data()!;
      for (const k of ["sellerId", "authorId", "userId", "ownerId"] as const) {
        const v = d[k];
        if (typeof v === "string" && v.trim()) {
          if (col === "marketPosts") return v.trim();
          if (!fallback) fallback = v.trim();
        }
      }
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

async function loadMessagesSorted(chatId: string) {
  const col = db.collection("chats").doc(chatId).collection("messages");
  try {
    const snap = await col.orderBy("createdAt", "asc").get();
    return snap.docs;
  } catch {
    const snap = await col.get();
    return snap.docs.sort((a, b) => tsMillis(a.data().createdAt) - tsMillis(b.data().createdAt));
  }
}

async function refreshChatTailFromMessages(chatId: string, dryRun: boolean) {
  const col = db.collection("chats").doc(chatId).collection("messages");
  let best: { doc: QueryDocumentSnapshot; t: number } | null = null;
  try {
    const tail = await col.orderBy("createdAt", "desc").limit(1).get();
    if (!tail.empty) {
      const d = tail.docs[0]!;
      best = { doc: d, t: tsMillis(d.data().createdAt) };
    }
  } catch {
    const all = await col.get();
    for (const d of all.docs) {
      const t = tsMillis(d.data().createdAt);
      if (!best || t >= best.t) best = { doc: d, t };
    }
  }
  if (!best || dryRun) return;

  const d = best.doc.data();
  const senderId = String(d.senderId ?? "").trim();
  await db.collection("chats").doc(chatId).update({
    lastMessage: {
      text: String(d.text ?? ""),
      senderId,
      type: d.type ?? "text",
      createdAt: d.createdAt ?? FieldValue.serverTimestamp(),
    },
    lastMessageAt: d.createdAt ?? FieldValue.serverTimestamp(),
    lastMessageSenderId: senderId,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function mergeGroup(canonicalKey: string, docs: QueryDocumentSnapshot[], dryRun: boolean) {
  const winner =
    docs.find((d) => d.id === canonicalKey) ??
    docs.reduce((best, d) => (lastActivityMillis(d.data()) > lastActivityMillis(best.data()) ? d : best));

  const losers = docs.filter((d) => d.id !== winner.id);
  if (losers.length === 0) return;

  const postId = String(winner.data().postId ?? "").trim();
  const pair = participantSortedPair(winner.data());
  if (!postId || !pair) {
    console.warn(`  skip group ${canonicalKey}: missing postId or pair`);
    return;
  }

  const listingOwner = await resolveListingOwnerUid(postId);
  console.log(`\n[merge] canonical=${canonicalKey}`);
  console.log(`  winner=${winner.id} losers=${losers.map((l) => l.id).join(", ")}`);
  if (dryRun) console.log("  (dry-run: no writes)");

  const winnerMsgs = await loadMessagesSorted(winner.id);
  const fpSeen = new Set<string>();
  for (const md of winnerMsgs) {
    fpSeen.add(msgFingerprint(md.data()));
  }

  let copied = 0;
  for (const loser of losers) {
    const loserData = loser.data();
    if (loserData.mergedInto && String(loserData.mergedInto).trim()) {
      console.log(`  skip loser ${loser.id}: already mergedInto=${loserData.mergedInto}`);
      continue;
    }

    const loserMsgs = await loadMessagesSorted(loser.id);
    let batch = db.batch();
    let ops = 0;

    for (const md of loserMsgs) {
      const fp = msgFingerprint(md.data());
      if (fpSeen.has(fp)) continue;
      fpSeen.add(fp);

      const dest = db.collection("chats").doc(winner.id).collection("messages").doc();
      const payload = sanitizeCopyPayload(md.data());
      payload._mergedFromChatId = loser.id;
      payload._mergedFromMessageId = md.id;

      if (!dryRun) {
        batch.set(dest, payload);
        ops++;
        if (ops >= 450) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }
      copied++;
    }
    if (!dryRun && ops > 0) await batch.commit();

    if (!dryRun) {
      await loser.ref.update({
        mergedInto: winner.id,
        status: "archived",
        tradeStatus: "merged",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  console.log(`  messages copied (new docs): ${copied}`);

  if (!dryRun && listingOwner && pair.includes(listingOwner)) {
    const buyer = pair[0] === listingOwner ? pair[1]! : pair[0]!;
    const sortedMembers = [listingOwner, buyer].sort((x, y) => x.localeCompare(y));
    await winner.ref.update({
      sellerId: listingOwner,
      buyerId: buyer,
      participants: sortedMembers,
      users: sortedMembers,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await refreshChatTailFromMessages(winner.id, dryRun);
}

async function main() {
  const { apply, postId } = CLI;
  const dryRun = !apply;

  if (!postId) {
    console.error(
      "Usage: npx tsx scripts/mergeDuplicateTradeChats.ts --postId=<POST_ID> [--apply] [--use-emulator]"
    );
    process.exit(1);
  }

  console.log(`postId=${postId} dryRun=${dryRun}`);

  const snap = await db.collection("chats").where("postId", "==", postId).get();
  if (snap.empty) {
    console.log("No chats for this postId.");
    return;
  }

  const groups = new Map<string, QueryDocumentSnapshot[]>();
  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const pid = String(d.postId ?? "").trim();
    if (pid !== postId) continue;
    const pair = participantSortedPair(d);
    if (!pair) continue;
    let key: string;
    try {
      key = buildChatId(pid, pair[0], pair[1]);
    } catch {
      continue;
    }
    const arr = groups.get(key) ?? [];
    arr.push(docSnap);
    groups.set(key, arr);
  }

  let dupGroups = 0;
  for (const [canonicalKey, arr] of groups) {
    const uniq = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const x of arr) uniq.set(x.id, x);
    const list = [...uniq.values()];
    if (list.length < 2) continue;
    dupGroups++;
    await mergeGroup(canonicalKey, list, dryRun);
  }

  if (dupGroups === 0) {
    console.log("\nNo duplicate trade chat groups for this postId.");
  } else if (dryRun) {
    console.log("\nDry-run finished. Re-run with --apply to write.");
  } else {
    console.log("\nDone.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
