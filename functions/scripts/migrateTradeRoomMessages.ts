/**
 * `chatRooms/trade_*` 하위 `messages` → `chats/{canonicalChatId}/messages` 로 복사 (1회 이행).
 *
 * canonicalChatId = `${postId}_${uidSmall}_${uidLarge}` (클라이언트 `buildChatId`와 동일)
 *
 * 실행:
 *   cd functions
 *   npx tsx scripts/migrateTradeRoomMessages.ts YOUR_POST_ID
 *   npx tsx scripts/migrateTradeRoomMessages.ts --postId=YOUR_POST_ID
 *   npx tsx scripts/migrateTradeRoomMessages.ts --roomId=trade_YOUR_POST_ID_uid_uid
 *   npx tsx scripts/migrateTradeRoomMessages.ts YOUR_POST_ID --apply
 *   npx tsx scripts/migrateTradeRoomMessages.ts YOUR_POST_ID --apply --overwrite
 *
 * 기본은 드라이런(로그만). 실제 쓰기는 `--apply`.
 * `--overwrite`: chats 쪽에 같은 message 문서 ID가 있어도 chatRooms 내용으로 merge 덮어씀 (ID 충돌·내용 불일치 시).
 *
 * 필요: `functions/serviceAccountKey.json` 또는 gcloud 기본 자격증명
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

function parseArgs() {
  const raw = process.argv.slice(2);
  const apply = raw.includes("--apply");
  const overwrite = raw.includes("--overwrite");
  let postId = "";
  let roomId = "";
  for (const a of raw) {
    if (a.startsWith("--postId=")) postId = a.slice("--postId=".length).trim();
    else if (a.startsWith("--roomId=")) roomId = a.slice("--roomId=".length).trim();
    else if (!a.startsWith("--") && a.trim()) {
      if (!postId) postId = a.trim();
    }
  }
  return { apply, overwrite, postId, roomId };
}

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
  if (!pid || !a || !b || a === b) {
    throw new Error("buildChatId: invalid args");
  }
  const [u1, u2] = a.localeCompare(b) <= 0 ? [a, b] : [b, a];
  return `${pid}_${u1}_${u2}`;
}

/** `chats` 문서 ID `post_uid_uid` 에서 정렬된 참가자 쌍 (클라 `parseTradeChatDocumentIdRoute` 와 동일) */
function sortedPairFromCanonicalChatDocId(chatId: string): [string, string] | null {
  const raw = String(chatId ?? "").trim();
  const parts = raw.split("_").filter(Boolean);
  if (parts.length < 3) return null;
  const uidB = parts[parts.length - 1]!;
  const uidA = parts[parts.length - 2]!;
  const uidLike = (u: string) => /^[A-Za-z0-9]+$/.test(u) && u.length >= 20;
  if (!uidLike(uidA) || !uidLike(uidB) || uidA === uidB) return null;
  return uidA.localeCompare(uidB) <= 0 ? [uidA, uidB] : [uidB, uidA];
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

function tsMillis(v: unknown): number {
  if (v instanceof Timestamp) {
    const ms = v.toMillis();
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

async function resolveSellerBuyerForMigration(
  data: DocumentData,
  productId: string
): Promise<{ sellerId: string; buyerId: string } | null> {
  let s = String(data.sellerId ?? "").trim();
  let b = String(data.buyerId ?? "").trim();
  if (s && b && s !== b) {
    return { sellerId: s, buyerId: b };
  }
  const raw = Array.isArray(data.participants)
    ? data.participants
    : Array.isArray(data.users)
      ? data.users
      : Array.isArray(data.members)
        ? data.members
        : [];
  const uniq = [...new Set(raw.map((x: unknown) => String(x).trim()).filter(Boolean))];
  if (uniq.length !== 2) return null;

  const owner = await resolveListingOwnerUid(productId);
  if (owner && uniq.includes(owner)) {
    const other = uniq.find((u) => u !== owner);
    if (other) return { sellerId: owner, buyerId: other };
  }

  uniq.sort((x, y) => x.localeCompare(y));
  return { sellerId: uniq[0]!, buyerId: uniq[1]! };
}

function sanitizeMessagePayload(data: DocumentData): DocumentData {
  const out: DocumentData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function refreshChatTailFromMessages(chatId: string) {
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
  if (!best) return;

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

async function migrateOneTradeRoom(
  roomSnap: QueryDocumentSnapshot,
  apply: boolean,
  overwrite: boolean
): Promise<{ copied: number; skipped: number; overwritten: number; targetChatId: string }> {
  const roomId = roomSnap.id;
  const data = roomSnap.data() as DocumentData;

  const isTradeType = data.type === "trade" || roomId.startsWith("trade_");
  if (!isTradeType) {
    console.log(`SKIP (not trade): ${roomId}`);
    return { copied: 0, skipped: 0, overwritten: 0, targetChatId: "" };
  }

  const productId = String(data.productId ?? "").trim();
  const pair = await resolveSellerBuyerForMigration(data, productId);
  if (!productId || !pair) {
    console.warn(`SKIP (missing productId or participants): ${roomId}`, {
      productId: productId || null,
      hasPair: !!pair,
    });
    return { copied: 0, skipped: 0, overwritten: 0, targetChatId: "" };
  }

  const { sellerId, buyerId } = pair;
  const targetChatId = buildChatId(productId, sellerId, buyerId);

  const idPair = sortedPairFromCanonicalChatDocId(targetChatId);
  const pairSorted: [string, string] =
    idPair ?? ([sellerId, buyerId].sort((x, y) => x.localeCompare(y)) as [string, string]);
  const pairSet = new Set(pairSorted);

  let sellerFinal = String(data.sellerId ?? sellerId).trim() || sellerId;
  let buyerFinal = String(data.buyerId ?? buyerId).trim() || buyerId;
  if (!pairSet.has(sellerFinal) || !pairSet.has(buyerFinal) || sellerFinal === buyerFinal) {
    const owner = await resolveListingOwnerUid(productId);
    if (owner && pairSet.has(owner)) {
      sellerFinal = owner;
      buyerFinal = pairSorted[0] === owner ? pairSorted[1]! : pairSorted[0]!;
    } else {
      sellerFinal = pairSorted[0]!;
      buyerFinal = pairSorted[1]!;
    }
  }

  const msgsSnap = await roomSnap.ref.collection("messages").orderBy("createdAt", "asc").get().catch(async () => {
    /** 인덱스 없으면 전체 get */
    return roomSnap.ref.collection("messages").get();
  });

  if (msgsSnap.empty) {
    console.log(`— ${roomId} → chats/${targetChatId}: 메시지 없음`);
    return { copied: 0, skipped: 0, overwritten: 0, targetChatId };
  }

  if (!apply) {
    console.log(
      `[dry-run] ${roomId} → chats/${targetChatId} (${msgsSnap.size}개 메시지)` +
        (overwrite ? " [overwrite: 기존 메시지 doc도 덮어쓸 예정]" : "")
    );
    return { copied: msgsSnap.size, skipped: 0, overwritten: 0, targetChatId };
  }

  const chatRef = db.collection("chats").doc(targetChatId);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) {
    await chatRef.set(
      {
        postId: productId,
        listingId: productId,
        sellerId: sellerFinal,
        buyerId: buyerFinal,
        participants: pairSorted,
        users: pairSorted,
        ...(data.participantsInfo && typeof data.participantsInfo === "object"
          ? { participantsInfo: data.participantsInfo }
          : {}),
        ...(data.productSnapshot ? { productSnapshot: data.productSnapshot } : {}),
        tradeStatus: "active",
        status: "active",
        _migratedFromChatRoom: roomId,
        _migratedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`✔ chats/${targetChatId} 부모 문서 생성(merge)`);
  } else {
    /** 기존 chats 문서에 participants/users가 빠지거나 UID 불일치 시 rules에서 메시지 읽기 실패 → 항상 canonical 쌍으로 보정 */
    await chatRef.set(
      {
        sellerId: sellerFinal,
        buyerId: buyerFinal,
        participants: pairSorted,
        users: pairSorted,
        _lastTradeRoomMigrationSource: roomId,
        _lastTradeRoomMigrationAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  let copied = 0;
  let skipped = 0;
  let overwritten = 0;
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let ops = 0;

  const flush = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const msg of msgsSnap.docs) {
    const destRef = chatRef.collection("messages").doc(msg.id);
    const existing = await destRef.get();
    if (existing.exists && !overwrite) {
      skipped++;
      continue;
    }
    if (existing.exists && overwrite) {
      overwritten++;
    }

    batch.set(
      destRef,
      {
        ...sanitizeMessagePayload(msg.data()),
        _migratedFrom: roomId,
        _migratedAt: FieldValue.serverTimestamp(),
        ...(overwrite && existing.exists ? { _migrationOverwrite: true } : {}),
      },
      { merge: true }
    );
    copied++;
    ops++;
    if (ops >= BATCH_SIZE) await flush();
  }
  await flush();

  if (apply && copied > 0) {
    try {
      await refreshChatTailFromMessages(targetChatId);
      console.log(`✔ chats/${targetChatId} lastMessage 동기화`);
    } catch (e) {
      console.warn(`lastMessage 갱신 실패(무시 가능):`, e);
    }
  }

  console.log(
    `✔ ${roomId} → chats/${targetChatId}: 쓰기 ${copied}건` +
      (skipped ? `, 스킵 ${skipped}건` : "") +
      (overwritten ? `, 덮어씀 ${overwritten}건` : "")
  );
  return { copied, skipped, overwritten, targetChatId };
}

async function main() {
  const { apply, overwrite, postId, roomId } = parseArgs();

  if (!postId && !roomId) {
    console.error(
      "사용법: npx tsx scripts/migrateTradeRoomMessages.ts <postId> [--apply] [--overwrite]\n" +
        "   또는: --postId=<postId> | --roomId=trade_...\n" +
        "기본 드라이런 — 실제 쓰기는 --apply — 기존 메시지 doc 덮어쓰기는 --overwrite"
    );
    process.exit(1);
  }

  console.log(
    [
      apply ? "모드: APPLY (실제 쓰기)" : "모드: DRY-RUN (로그만)",
      overwrite ? "덮어쓰기: ON (--overwrite)" : "덮어쓰기: OFF",
    ].join(" | ")
  );

  const rooms: QueryDocumentSnapshot[] = [];

  if (roomId) {
    const snap = await db.collection("chatRooms").doc(roomId).get();
    if (!snap.exists) {
      console.error(`chatRooms 문서 없음: ${roomId}`);
      process.exit(1);
    }
    rooms.push(snap as QueryDocumentSnapshot);
  } else {
    const q = await db.collection("chatRooms").where("productId", "==", postId).get();
    q.docs.forEach((d) => rooms.push(d));
    if (rooms.length === 0) {
      console.warn(`productId="${postId}" 인 chatRooms 없음. trade_* ID 직접 지정: --roomId=trade_...`);
    }
  }

  let totalCopied = 0;
  let totalSkipped = 0;
  let totalOverwritten = 0;

  for (const room of rooms) {
    const r = await migrateOneTradeRoom(room, apply, overwrite);
    totalCopied += r.copied;
    totalSkipped += r.skipped;
    totalOverwritten += r.overwritten;
  }

  console.log(
    apply
      ? `완료: 방 ${rooms.length}개, 메시지 쓰기 ${totalCopied}건, 스킵 ${totalSkipped}건, 덮어쓴 문서 ${totalOverwritten}건`
      : `드라이런: 방 ${rooms.length}개, 처리 예정 메시지 ${totalCopied}건 — 실제 반영: --apply${overwrite ? " --overwrite" : ""}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
