/**
 * 거래 1:1 `chats` — 동일 postId·동일 참가자 쌍의 중복 문서를 정규 chatId(`buildChatId`) 한 방으로 병합.
 * 클라이언트 규칙/레거시 URL 한계를 넘기 위해 Admin에서 실행.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  FieldValue,
  getFirestore,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const REGION = "asia-northeast3";

function db() {
  return getFirestore();
}

function buildChatId(postId: string, participantA: string, participantB: string): string {
  const pid = String(postId ?? "").trim();
  const a = String(participantA ?? "").trim();
  const b = String(participantB ?? "").trim();
  if (!pid || !a || !b || a === b) throw new Error("buildChatId: invalid args");
  const [u1, u2] = a.localeCompare(b) <= 0 ? [a, b] : [b, a];
  return `${pid}_${u1}_${u2}`;
}

function parseTradeChatDocumentIdRoute(rid: string): { postId: string; uidA: string; uidB: string } | null {
  const raw = String(rid ?? "").trim();
  const parts = raw.split("_").filter(Boolean);
  if (parts.length < 3) return null;
  const uidB = parts[parts.length - 1]!;
  const uidA = parts[parts.length - 2]!;
  const postId = parts.slice(0, -2).join("_");
  const uidLike = (u: string) => /^[A-Za-z0-9]+$/.test(u) && u.length >= 20;
  if (!postId || !uidLike(uidA) || !uidLike(uidB) || uidA === uidB) return null;
  return { postId, uidA, uidB };
}

/** 클라이언트 `tradeChatDocumentCandidates` 와 동일 — 레거시 문서 ID 후보 */
function tradeChatDocumentCandidateIds(postId: string, sellerId: string, buyerId: string): string[] {
  const pid = String(postId ?? "").trim();
  const s = String(sellerId ?? "").trim();
  const b = String(buyerId ?? "").trim();
  if (!pid || !s || !b || s === b) return [];
  const canon = buildChatId(pid, s, b);
  const ordered = [canon, `${pid}_${s}_${b}`, `${pid}_${b}_${s}`];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ordered) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * 문서 ID 또는 participants/seller/buyer 로 동일 거래 스레드인지 판별.
 * 한쪽 문서만 `postId` 필드가 비어 있어도 문서 ID만 맞으면 찾을 수 있게 함.
 */
function docBelongsToCanonicalPair(
  docSnap: DocumentSnapshot,
  expectedPostId: string,
  canonicalKey: string
): boolean {
  if (!docSnap.exists) return false;
  const into = docSnap.data()?.mergedInto;
  if (into && String(into).trim()) return false;

  const parsedId = parseTradeChatDocumentIdRoute(docSnap.id);
  if (parsedId && parsedId.postId === expectedPostId) {
    try {
      return buildChatId(parsedId.postId, parsedId.uidA, parsedId.uidB) === canonicalKey;
    } catch {
      return false;
    }
  }

  const p = participantSortedPair(docSnap.data() as DocumentData);
  if (p) {
    try {
      return buildChatId(expectedPostId, p[0], p[1]) === canonicalKey;
    } catch {
      return false;
    }
  }

  return false;
}

/** users/participants 가 진실 — 레거시에 seller·buyer 필드만 틀린 문서가 많음 */
function participantSortedPair(data: DocumentData): [string, string] | null {
  const raw: unknown[] = [
    ...(Array.isArray(data.participants) ? data.participants : []),
    ...(Array.isArray(data.users) ? data.users : []),
  ];
  const fromMembers = [...new Set(raw.map((x: unknown) => String(x).trim()).filter(Boolean))];
  if (fromMembers.length === 2) {
    fromMembers.sort((x, y) => x.localeCompare(y));
    return [fromMembers[0]!, fromMembers[1]!];
  }

  const s = String(data.sellerId ?? "").trim();
  const b = String(data.buyerId ?? "").trim();
  if (s && b && s !== b) {
    return s.localeCompare(b) <= 0 ? [s, b] : [b, s];
  }

  return null;
}

function participantUidSet(data: DocumentData): Set<string> {
  const out = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v.trim()) out.add(v.trim());
  };
  const arr = (v: unknown) => {
    if (Array.isArray(v)) (v as unknown[]).forEach(add);
  };
  arr(data.users);
  arr(data.participants);
  add(data.sellerId);
  add(data.buyerId);
  return out;
}

function tsMillis(v: unknown): number {
  if (v instanceof Timestamp) {
    const ms = v.toMillis();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (
    v &&
    typeof v === "object" &&
    "toMillis" in v &&
    typeof (v as { toMillis: () => number }).toMillis === "function"
  ) {
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

async function loadMessagesSorted(chatId: string) {
  const col = db().collection("chats").doc(chatId).collection("messages");
  try {
    const snap = await col.orderBy("createdAt", "asc").get();
    return snap.docs;
  } catch {
    const snap = await col.get();
    return snap.docs.sort((a, b) => tsMillis(a.data().createdAt) - tsMillis(b.data().createdAt));
  }
}

async function refreshChatTailFromMessages(chatId: string) {
  const col = db().collection("chats").doc(chatId).collection("messages");
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
  await db()
    .collection("chats")
    .doc(chatId)
    .update({
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

async function resolveListingOwnerUid(postId: string): Promise<string | null> {
  const pid = String(postId ?? "").trim();
  if (!pid) return null;
  const cols = ["marketPosts", "market", "marketProducts"] as const;
  let fallback: string | null = null;
  for (const col of cols) {
    try {
      const snap = await db().collection(col).doc(pid).get();
      if (!snap.exists) continue;
      const d = snap.data()!;
      for (const k of ["authorId", "sellerId", "userId", "ownerId"] as const) {
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

/** 레거시 단일 문서 ID만 있고 정규 ID 문서가 없을 때 — 메타·메시지를 정규 경로로 복제 후 레거시 아카이브 */
async function promoteSingleLegacyToCanonical(
  canonicalKey: string,
  legacy: QueryDocumentSnapshot,
  listingOwner: string | null,
  pair: [string, string]
): Promise<void> {
  const L = legacy.id;
  if (L === canonicalKey) return;

  const canonRef = db().collection("chats").doc(canonicalKey);
  const canonSnap = await canonRef.get();
  if (canonSnap.exists) {
    return;
  }

  const src = legacy.data();
  const sellerId =
    listingOwner && pair.includes(listingOwner)
      ? listingOwner
      : String(src.sellerId ?? "").trim() || pair[0]!;
  const buyerId =
    sellerId === pair[0] ? pair[1]! : sellerId === pair[1] ? pair[0]! : String(src.buyerId ?? "").trim() || pair[1]!;
  const sortedMembers = [sellerId, buyerId].sort((x, y) => x.localeCompare(y));

  const meta = { ...src };
  delete (meta as { mergedInto?: unknown }).mergedInto;
  meta.sellerId = sellerId;
  meta.buyerId = buyerId;
  meta.participants = sortedMembers;
  meta.users = sortedMembers;
  meta.updatedAt = FieldValue.serverTimestamp();
  meta._promotedFromChatId = L;

  await canonRef.set(meta);

  const msgs = await loadMessagesSorted(L);
  let batch = db().batch();
  let ops = 0;
  for (const md of msgs) {
    const dest = canonRef.collection("messages").doc();
    const payload = sanitizeCopyPayload(md.data());
    payload._mergedFromChatId = L;
    payload._mergedFromMessageId = md.id;
    batch.set(dest, payload);
    ops++;
    if (ops >= 450) {
      await batch.commit();
      batch = db().batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  await legacy.ref.update({
    mergedInto: canonicalKey,
    status: "archived",
    tradeStatus: "merged",
    updatedAt: FieldValue.serverTimestamp(),
  });

  await refreshChatTailFromMessages(canonicalKey);
}

async function mergeGroup(
  canonicalKey: string,
  docs: QueryDocumentSnapshot[]
): Promise<{ winnerId: string; merged: boolean }> {
  const winner =
    docs.find((d) => d.id === canonicalKey) ??
    docs.reduce((best, d) => (lastActivityMillis(d.data()) > lastActivityMillis(best.data()) ? d : best));

  const losers = docs.filter((d) => {
    if (d.id === winner.id) return false;
    const into = d.data().mergedInto;
    return !(into && String(into).trim());
  });
  if (losers.length === 0) {
    return { winnerId: winner.id, merged: false };
  }

  let merged = false;
  const postId = String(winner.data().postId ?? "").trim();
  const pair = participantSortedPair(winner.data());
  if (!postId || !pair) {
    logger.warn("[ensureCanonicalTradeChat] skip merge: missing postId or pair", { canonicalKey });
    return { winnerId: winner.id, merged: false };
  }

  const listingOwner = await resolveListingOwnerUid(postId);

  const winnerMsgs = await loadMessagesSorted(winner.id);
  const fpSeen = new Set<string>();
  for (const md of winnerMsgs) {
    fpSeen.add(msgFingerprint(md.data()));
  }

  for (const loser of losers) {
    const loserData = loser.data();
    if (loserData.mergedInto && String(loserData.mergedInto).trim()) {
      continue;
    }

    const loserMsgs = await loadMessagesSorted(loser.id);
    let batch = db().batch();
    let ops = 0;

    for (const md of loserMsgs) {
      const fp = msgFingerprint(md.data());
      if (fpSeen.has(fp)) continue;
      fpSeen.add(fp);

      const dest = db().collection("chats").doc(winner.id).collection("messages").doc();
      const payload = sanitizeCopyPayload(md.data());
      payload._mergedFromChatId = loser.id;
      payload._mergedFromMessageId = md.id;

      batch.set(dest, payload);
      ops++;
      merged = true;
      if (ops >= 450) {
        await batch.commit();
        batch = db().batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();

    await loser.ref.update({
      mergedInto: winner.id,
      status: "archived",
      tradeStatus: "merged",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  if (listingOwner && pair.includes(listingOwner)) {
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

  await refreshChatTailFromMessages(winner.id);
  return { winnerId: winner.id, merged };
}

export type EnsureCanonicalTradeChatResponse = {
  canonicalChatId: string;
  merged: boolean;
};

export const ensureCanonicalTradeChat = onCall({ region: REGION }, async (request): Promise<EnsureCanonicalTradeChatResponse> => {
  const viewerUid = request.auth?.uid;
  if (!viewerUid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const chatId = typeof request.data?.chatId === "string" ? request.data.chatId.trim() : "";
  if (!chatId) {
    throw new HttpsError("invalid-argument", "chatId가 필요합니다.");
  }

  const snap = await db().collection("chats").doc(chatId).get();

  let postId = "";
  let pair: [string, string] | null = null;

  if (snap.exists) {
    const d = snap.data()!;
    postId = String(d.postId ?? "").trim();
    pair = participantSortedPair(d);
  }

  const parsed = parseTradeChatDocumentIdRoute(chatId);
  if (!postId && parsed) postId = parsed.postId;
  if (!pair && parsed) {
    const a = parsed.uidA;
    const b = parsed.uidB;
    pair = a.localeCompare(b) <= 0 ? [a, b] : [b, a];
  }

  if (!postId || !pair || pair[0] === pair[1]) {
    throw new HttpsError("failed-precondition", "거래 채팅(postId·참가자)을 확인할 수 없습니다.");
  }

  /** 필드 불일치 시에도 문서에 기록된 멤버가 딱 2명이면 그걸 신뢰 (callable permission-denied 방지) */
  if (snap.exists) {
    const set = participantUidSet(snap.data()!);
    if (set.size === 2 && set.has(viewerUid)) {
      const sorted = [...set].sort((x, y) => x.localeCompare(y));
      pair = [sorted[0]!, sorted[1]!];
    }
  }

  if (viewerUid !== pair[0] && viewerUid !== pair[1]) {
    throw new HttpsError("permission-denied", "이 거래의 참가자만 통합할 수 있습니다.");
  }

  let canonicalKey: string;
  try {
    canonicalKey = buildChatId(postId, pair[0], pair[1]);
  } catch {
    throw new HttpsError("failed-precondition", "정규 chatId를 만들 수 없습니다.");
  }

  const listingOwner = await resolveListingOwnerUid(postId);

  let sellerIdGuess = "";
  let buyerIdGuess = "";
  if (listingOwner && pair.includes(listingOwner)) {
    sellerIdGuess = listingOwner;
    buyerIdGuess = pair[0] === listingOwner ? pair[1]! : pair[0]!;
  } else if (snap.exists) {
    sellerIdGuess = String(snap.data()!.sellerId ?? "").trim();
    buyerIdGuess = String(snap.data()!.buyerId ?? "").trim();
  }

  const uniq = new Map<string, QueryDocumentSnapshot>();

  const addIfMatch = (docSnap: DocumentSnapshot) => {
    if (!docBelongsToCanonicalPair(docSnap, postId, canonicalKey)) return;
    uniq.set(docSnap.id, docSnap as QueryDocumentSnapshot);
  };

  try {
    const q = await db().collection("chats").where("postId", "==", postId).get();
    for (const d of q.docs) addIfMatch(d);
  } catch (e) {
    logger.warn("[ensureCanonicalTradeChat] postId query 실패, 후보 get만 진행", e);
  }

  const candidateIds = new Set<string>();
  candidateIds.add(canonicalKey);
  candidateIds.add(`${postId}_${pair[1]}_${pair[0]}`);
  if (sellerIdGuess && buyerIdGuess) {
    for (const id of tradeChatDocumentCandidateIds(postId, sellerIdGuess, buyerIdGuess)) {
      candidateIds.add(id);
    }
  }

  for (const id of candidateIds) {
    try {
      const d = await db().collection("chats").doc(id).get();
      addIfMatch(d);
    } catch {
      /* ignore */
    }
  }

  /** 이미 다른 방으로 합쳐진 소스 문서는 제외 — docBelongsToCanonicalPair 에서 mergedInto 처리함 */
  const list = [...uniq.values()];

  if (list.length === 0) {
    return { canonicalChatId: canonicalKey, merged: false };
  }

  if (list.length === 1) {
    const only = list[0]!;
    if (only.id !== canonicalKey) {
      await promoteSingleLegacyToCanonical(canonicalKey, only, listingOwner, pair);
      logger.info("[ensureCanonicalTradeChat] promoted single legacy → canonical", {
        from: only.id,
        to: canonicalKey,
      });
      return { canonicalChatId: canonicalKey, merged: true };
    }
    return { canonicalChatId: canonicalKey, merged: false };
  }

  let { winnerId, merged } = await mergeGroup(canonicalKey, list);

  const canonSnapAfter = await db().collection("chats").doc(canonicalKey).get();
  if (winnerId !== canonicalKey && !canonSnapAfter.exists) {
    const wRef = await db().collection("chats").doc(winnerId).get();
    if (wRef.exists) {
      const promotedFrom = winnerId;
      await promoteSingleLegacyToCanonical(canonicalKey, wRef as QueryDocumentSnapshot, listingOwner, pair);
      winnerId = canonicalKey;
      merged = true;
      logger.info("[ensureCanonicalTradeChat] promoted merged winner → canonical", {
        from: promotedFrom,
        to: canonicalKey,
      });
    }
  }

  if (merged) {
    logger.info("[ensureCanonicalTradeChat] merged duplicate trade chats", {
      canonicalKey,
      winnerId,
      count: list.length,
    });
  }

  return { canonicalChatId: winnerId, merged };
});
