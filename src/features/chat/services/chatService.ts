import { auth, db } from "@/lib/firebase";
import {
  fetchTradeThreadMemberIdsForChat,
  sortedTradeThreadMemberIds,
} from "@/lib/chat/tradeChatThreadMemberIds";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

export type CreateChatParams = {
  postId: string;
  postTitle: string;
  postImage?: string;
  sport?: string;
  sellerId: string;
  buyerId: string;
  sellerName?: string;
  buyerName?: string;
  sellerAvatar?: string;
  buyerAvatar?: string;
  /** 상품별 스레드 분리·채팅방 헤더용 (없으면 postId만 사용) */
  listingId?: string;
  productPrice?: number;
  productCategory?: string;
};

/**
 * 거래 1:1 `chats/{chatId}` 문서 ID — 같은 postId·같은 두 사람이면 항상 하나의 ID만 나오게 한다.
 * 참가자 두 UID는 `localeCompare`로 정렬해 접미부 고정(판매자/구매자 순과 무관).
 */
export function buildChatId(postId: string, participantA: string, participantB: string): string {
  const pid = String(postId ?? "").trim();
  const a = String(participantA ?? "").trim();
  const b = String(participantB ?? "").trim();
  if (!pid || !a || !b || a === b) {
    throw new Error("chatId 구성 인자가 올바르지 않습니다.");
  }
  const [u1, u2] = a.localeCompare(b) <= 0 ? [a, b] : [b, a];
  return `${pid}_${u1}_${u2}`;
}

/** 동일 글·동일 두 사람이면 항상 같은 문서 ID (`buildChatId` 별칭, 진입 UI에서 안정 ID 미리보기용) */
export function getStableChatId(postId: string, uid1: string, uid2: string): string {
  return buildChatId(postId, uid1, uid2);
}

/**
 * `chatRooms` 레거시 거래 방 ID (`trade_${buildChatId(...)`) → `chats/{id}` 라우트용 ID.
 * 이미 정규 chatId면 그대로 반환.
 */
export function normalizeTradeChatDocumentIdForRoute(id: string): string {
  const s = String(id ?? "").trim();
  if (!s) return s;
  return s.startsWith("trade_") ? s.slice("trade_".length) : s;
}

/** 레거시(`postId_seller_buyer`)·순서 바뀐 문서까지 같은 스레드로 인식 */
function tradeChatDocumentCandidates(postId: string, sellerId: string, buyerId: string): string[] {
  const pid = String(postId ?? "").trim();
  const s = String(sellerId ?? "").trim();
  const b = String(buyerId ?? "").trim();
  const canon = buildChatId(pid, s, b);
  /** canonical ID를 먼저 조회해 list 쿼리 없이 대부분 수렴 */
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
 * 후보 문서 ID·참가자 쿼리로 같은 거래 쌍(postId + seller/buyer) 방을 모은 뒤,
 * `lastMessageAt` 기준으로 하나만 선택 (분리된 두 방 중 실제 대화가 있는 쪽으로 수렴).
 */
function isFirestorePermissionDenied(err: unknown): boolean {
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code?: string }).code) : "";
  return code === "permission-denied";
}

async function safeGetChatSnap(chatId: string): Promise<DocumentSnapshot | null> {
  try {
    return await getDoc(doc(db, "chats", chatId));
  } catch (e) {
    if (isFirestorePermissionDenied(e)) {
      console.warn("[chatService] chats 문서 읽기 거부(레거시·ACL 불일치 가능), 후보 스킵:", chatId);
      return null;
    }
    throw e;
  }
}

async function pickBestTradeChatForPair(
  canonicalPostId: string,
  sellerFinal: string,
  buyerFinal: string,
  viewerUid: string,
  extraListingAliases?: Set<string>
): Promise<{ chatId: string; snap: DocumentSnapshot } | null> {
  const canonicalPid = String(canonicalPostId ?? "").trim();
  const s = String(sellerFinal ?? "").trim();
  const b = String(buyerFinal ?? "").trim();
  const uid = String(viewerUid ?? "").trim();
  if (!canonicalPid || !s || !b || s === b || !uid) return null;

  const listingAliases = new Set<string>(extraListingAliases ?? []);
  listingAliases.add(canonicalPid);

  const byId = new Map<string, DocumentSnapshot>();
  const triedChatIds = new Set<string>();

  for (const pid of listingAliases) {
    const p = String(pid ?? "").trim();
    if (!p) continue;
    for (const chatId of tradeChatDocumentCandidates(p, s, b)) {
      if (triedChatIds.has(chatId)) continue;
      triedChatIds.add(chatId);
      const snap = await safeGetChatSnap(chatId);
      if (!snap?.exists()) continue;
      const data = snap.data() as Record<string, unknown>;
      if (!chatDocContainsPair(data, s, b)) continue;
      if (!chatDocMatchesListingAliases(data, listingAliases)) continue;
      byId.set(chatId, snap);
    }
  }

  /** list 쿼리 실패 시에도 위 후보 getDoc만으로 동작 가능 */
  const qHit = await findTradeChatDocByParticipantQuery(listingAliases, s, b, uid);
  if (qHit) {
    const data = qHit.snap.data() as Record<string, unknown>;
    if (chatDocContainsPair(data, s, b)) {
      byId.set(qHit.chatId, qHit.snap);
    }
  }

  // postId 단독 쿼리는 규칙상 거부됨(동일 postId·다른 참가자 문서가 결과 집합에 들어갈 수 있음) — 사용 금지.

  if (byId.size === 0) return null;

  /** 동일 거래에 레거시(`postId_seller_buyer`)와 정규(`postId`+UID 정렬) 문서가 같이 있으면 항상 정규 ID로 수렴 — lastMessageAt만 보면 한쪽 방만 보이는 분리 현상 방지 */
  const canon = buildChatId(canonicalPid, s, b);
  const canonSnap = byId.get(canon);
  if (canonSnap) {
    return { chatId: canon, snap: canonSnap };
  }

  const snaps = [...byId.values()];
  snaps.sort(
    (a, bb) =>
      lastMessageAtMillis(bb.data() as Record<string, unknown>) -
      lastMessageAtMillis(a.data() as Record<string, unknown>)
  );
  const best = snaps[0]!;
  return { chatId: best.id, snap: best };
}

function participantUidsFromChatDoc(data: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v.trim()) out.add(v.trim());
  };
  const arr = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(add);
  };
  arr(data.users);
  arr(data.participants);
  add(data.sellerId);
  add(data.buyerId);
  return out;
}

function chatDocContainsPair(data: Record<string, unknown>, a: string, b: string): boolean {
  const s = String(a).trim();
  const t = String(b).trim();
  if (!s || !t) return false;
  const set = participantUidsFromChatDoc(data);
  return set.has(s) && set.has(t);
}

/** 기존 채팅 문서가 postId·listingId·product.id 중 어디에든 같은 글 키를 넣었으면 동일 스레드로 인정 */
function chatDocMatchesListingAliases(data: Record<string, unknown>, aliases: Set<string>): boolean {
  if (!aliases.size) return false;
  const hit = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return !!s && aliases.has(s);
  };
  if (hit(data.postId)) return true;
  if (hit(data.listingId)) return true;
  const prod = data.product as { id?: unknown } | undefined;
  if (prod && typeof prod.id === "string" && aliases.has(prod.id.trim())) return true;
  return false;
}

function lastMessageAtMillis(data: Record<string, unknown>): number {
  const lm = data.lastMessageAt as { toMillis?: () => number } | undefined;
  if (lm && typeof lm.toMillis === "function") {
    try {
      const ms = lm.toMillis();
      return Number.isFinite(ms) ? ms : 0;
    } catch {
      /* ignore */
    }
  }
  const ca = data.createdAt as { toMillis?: () => number } | undefined;
  if (ca && typeof ca.toMillis === "function") {
    try {
      const ms = ca.toMillis();
      return Number.isFinite(ms) ? ms : 0;
    } catch {
      /* ignore */
    }
  }
  return 0;
}

/**
 * 동일 거래 스레드 후보를 `array-contains` 단일 조건으로만 조회한 뒤, 클라이언트에서 postId·쌍 필터.
 *
 * `postId == … AND participants array-contains uid` 복합 쿼리는 Rules 정적 검증과 맞물리며 permission-denied가 나기 쉬움.
 * chats `allow list` 가 인증 사용자에게 완화된 배포라면 쿼리 거부는 줄어든다(단건·메시지는 chatParticipant 유지).
 *
 * 주의: `postId`만 쿼리하고 클라이언트에서 필터하면 안 된다. 같은 글에 다른 구매자 방이 있으면
 * Rules가 타인 문서 읽기를 허용한다고 증명할 수 없어 전체 쿼리가 거부된다.
 */
async function findTradeChatDocByParticipantQuery(
  postIdAliases: Set<string>,
  sellerFinal: string,
  buyerFinal: string,
  uid: string
): Promise<{ chatId: string; snap: DocumentSnapshot } | null> {
  if (!postIdAliases.size) return null;

  const limitN = 80;
  const qParticipants = query(
    collection(db, "chats"),
    where("participants", "array-contains", uid),
    limit(limitN)
  );
  const qUsers = query(collection(db, "chats"), where("users", "array-contains", uid), limit(limitN));

  try {
    const [resP, resU] = await Promise.all([getDocs(qParticipants), getDocs(qUsers)]);
    const hits: { chatId: string; snap: QueryDocumentSnapshot; t: number }[] = [];
    const seen = new Set<string>();

    for (const d of [...resP.docs, ...resU.docs]) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      const data = d.data() as Record<string, unknown>;
      if (!chatDocMatchesListingAliases(data, postIdAliases)) continue;
      if (!chatDocContainsPair(data, sellerFinal, buyerFinal)) continue;
      hits.push({ chatId: d.id, snap: d, t: lastMessageAtMillis(data) });
    }
    if (hits.length === 0) return null;
    hits.sort((x, y) => y.t - x.t);
    const best = hits[0]!;
    return { chatId: best.chatId, snap: best.snap };
  } catch (e) {
    if (import.meta.env.DEV && isFirestorePermissionDenied(e)) {
      console.warn("[chatService] 동일 거래 방 list 탐색 거부(규칙·배포 확인). getDoc 후보만 사용:", e);
    }
    return null;
  }
}

/**
 * 레거시 방: 문서 ID·sellerId가 틀려도 참가자가 (구매자 + 임의 판매자 후보) 2명이면 같은 글 스레드로 간주.
 * 엄격한 chatDocContainsPair 조회가 실패할 때 구매자가 예전 방으로 수렴하게 한다.
 */
async function findTradeChatDocsBuyerListingRelaxed(
  listingAliases: Set<string>,
  buyerUid: string,
  uidForQuery: string
): Promise<QueryDocumentSnapshot[]> {
  const aliases = listingAliases;
  const buyer = String(buyerUid ?? "").trim();
  const qUid = String(uidForQuery ?? "").trim();
  if (!aliases.size || !buyer || !qUid) return [];

  const limitN = 80;
  const qParticipants = query(
    collection(db, "chats"),
    where("participants", "array-contains", qUid),
    limit(limitN)
  );
  const qUsers = query(collection(db, "chats"), where("users", "array-contains", qUid), limit(limitN));

  try {
    const [resP, resU] = await Promise.all([getDocs(qParticipants), getDocs(qUsers)]);
    const out: QueryDocumentSnapshot[] = [];
    const seen = new Set<string>();

    for (const d of [...resP.docs, ...resU.docs]) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      const data = d.data() as Record<string, unknown>;
      if (!chatDocMatchesListingAliases(data, aliases)) continue;
      const set = participantUidsFromChatDoc(data);
      if (set.size !== 2 || !set.has(buyer)) continue;
      out.push(d);
    }
    out.sort(
      (a, b) =>
        lastMessageAtMillis(b.data() as Record<string, unknown>) -
        lastMessageAtMillis(a.data() as Record<string, unknown>)
    );
    return out;
  } catch (e) {
    if (import.meta.env.DEV && isFirestorePermissionDenied(e)) {
      console.warn("[chatService] 완화 거래 방 탐색 거부:", e);
    }
    return [];
  }
}

function pickBestRelaxedTradeChatForBuyer(
  docs: QueryDocumentSnapshot[],
  buyerUid: string,
  trustedSellerUid: string | null
): QueryDocumentSnapshot | null {
  if (docs.length === 0) return null;
  const buyer = String(buyerUid ?? "").trim();
  const trusted = trustedSellerUid ? String(trustedSellerUid).trim() : "";
  if (trusted) {
    const exact = docs.filter((d) =>
      chatDocContainsPair(d.data() as Record<string, unknown>, trusted, buyer)
    );
    if (exact.length >= 1) return exact[0]!;
  }
  return docs[0]!;
}

/**
 * `postId`와 `listingId`가 서로 다른 문자열로 들어오면 채팅 문서 ID가 둘로 갈라짐.
 * `marketPosts`에 실제 존재하는 쪽을 채팅 스레드의 postId로 고정한다.
 */
export async function resolveTradeChatPostIdForMarketHub(postId: string, listingId?: string): Promise<string> {
  const p = String(postId ?? "").trim();
  const l = listingId ? String(listingId).trim() : "";
  if (!p && l) return l;
  if (!p) return "";
  if (!l || p === l) return p;
  try {
    const [sp, sl] = await Promise.all([
      getDoc(doc(db, "marketPosts", p)),
      getDoc(doc(db, "marketPosts", l)),
    ]);
    const pe = sp.exists();
    const le = sl.exists();
    if (pe && !le) return p;
    if (le && !pe) return l;
  } catch {
    /* ignore */
  }
  return p;
}

/** `market` / `marketPosts` / `marketProducts` 중 실제 게시글 소유자 UID (채팅 sellerFinal 단일화) */
function pickListingOwnerUid(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  /** 허브 게시글은 authorId가 SSOT — sellerId/ownerId만 맞는 레거시 상품과 갈라짐 방지 */
  const keys = ["authorId", "sellerId", "userId", "ownerId"] as const;
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * 거래 채팅의 판매자 UID 단일화.
 * 종목 마켓 리스트는 `marketPosts`가 SSOT에 가깝고, 예전 `market` 문서가 같은 id로 남아 있으면
 * 컬렉션 순서만으로 소유자가 갈라져 서로 다른 chatId가 생길 수 있음 → 항상 marketPosts 우선.
 */
export async function resolveListingOwnerUid(postId: string): Promise<string | null> {
  const pid = String(postId ?? "").trim();
  if (!pid) return null;
  const cols = ["marketPosts", "market", "marketProducts"] as const;
  let fallback: string | null = null;
  for (const col of cols) {
    try {
      const snap = await getDoc(doc(db, col, pid));
      if (!snap.exists()) continue;
      const owner = pickListingOwnerUid(snap.data() as Record<string, unknown>);
      if (!owner) continue;
      if (col === "marketPosts") return owner;
      if (!fallback) fallback = owner;
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

/**
 * 거래 `chats` 문서의 participants/users를 sellerId·buyerId와 일치시키는 백필.
 * - 문서 ID가 `postId_uid_uid` 패턴이면 **그 두 UID가 SSOT** — 필드가 어긋나면 listing 소유자로 seller/buyer 라벨만 맞추고 배열은 정렬 쌍으로 고정.
 * - 배열 길이가 2가 아니거나 한쪽만 있으면 `[uidLo, uidHi]` 로 덮어씀.
 * 규칙·메시지 읽기: buyer/seller 또는 users/participants에 로그인 uid가 있어야 함 → 마이그레이션 오류로 상대가 빠진 경우 여기서 복구.
 */
export async function ensureTradeChatParticipants(chatId: string): Promise<void> {
  const cid = String(chatId ?? "").trim();
  if (!cid) return;
  const ref = doc(db, "chats", cid);
  let snap: DocumentSnapshot;
  try {
    snap = await getDoc(ref);
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[chatService] ensureTradeChatParticipants: chats 문서 읽기 실패(권한·네트워크)", {
        chatId: cid,
        e,
      });
    }
    return;
  }
  if (!snap.exists()) return;
  const d = snap.data() as Record<string, unknown>;

  const strArr = (raw: unknown): string[] =>
    Array.isArray(raw) ? raw.map((x) => String(x).trim()).filter(Boolean) : [];

  const sortedPairFromTwo = (a: string, b: string): [string, string] =>
    a.localeCompare(b) <= 0 ? [a, b] : [b, a];

  const matchesSortedPairArrays = (arr: string[], u0: string, u1: string) => {
    if (arr.length !== 2) return false;
    const t = [...arr].sort((x, y) => x.localeCompare(y));
    return t[0] === u0 && t[1] === u1;
  };

  const parsedRoute = parseTradeChatDocumentIdRoute(cid);
  if (parsedRoute) {
    const [u0, u1] = sortedPairFromTwo(parsedRoute.uidA, parsedRoute.uidB);
    const postId = String(d.postId ?? parsedRoute.postId ?? "").trim();

    let sellerId = String(d.sellerId ?? "").trim();
    let buyerId = String(d.buyerId ?? "").trim();
    const pairSet = new Set<string>([u0, u1]);
    const labelsMatchPair =
      pairSet.has(sellerId) && pairSet.has(buyerId) && sellerId !== buyerId;

    if (!labelsMatchPair) {
      if (postId) {
        try {
          const owner = await resolveListingOwnerUid(postId);
          if (owner && pairSet.has(owner)) {
            sellerId = owner;
            buyerId = owner === u0 ? u1 : u0;
          } else {
            sellerId = u0;
            buyerId = u1;
          }
        } catch {
          sellerId = u0;
          buyerId = u1;
        }
      } else {
        sellerId = u0;
        buyerId = u1;
      }
    }

    const usersArr = strArr(d.users);
    const partsArr = strArr(d.participants);
    const arraysOk = matchesSortedPairArrays(usersArr, u0, u1) && matchesSortedPairArrays(partsArr, u0, u1);
    const postIdOk = !postId ? true : String(d.postId ?? "").trim() === postId;
    const sellerBuyerOk =
      String(d.sellerId ?? "").trim() === sellerId && String(d.buyerId ?? "").trim() === buyerId;

    if (arraysOk && sellerBuyerOk && postIdOk) return;

    try {
      await updateDoc(ref, {
        sellerId,
        buyerId,
        users: [u0, u1],
        participants: [u0, u1],
        ...(String(d.postId ?? "").trim() || !postId ? {} : { postId }),
        updatedAt: serverTimestamp(),
      });
      if (import.meta.env.DEV) {
        console.log("[chatService] ensureTradeChatParticipants: 문서 ID 기준 participants/users 정규화", {
          chatId: cid,
          sellerId,
          buyerId,
          users: [u0, u1],
        });
      }
    } catch (e) {
      console.warn("[chatService] ensureTradeChatParticipants 실패:", e);
    }
    return;
  }

  let sellerId = String(d.sellerId ?? "").trim();
  let buyerId = String(d.buyerId ?? "").trim();
  const postId = String(d.postId ?? "").trim();

  if (!sellerId || !buyerId || sellerId === buyerId) {
    if (postId) {
      try {
        const owner = await resolveListingOwnerUid(postId);
        const partsOnly = strArr(d.participants);
        const usersOnly = strArr(d.users);
        const pair = partsOnly.length === 2 ? partsOnly : usersOnly.length === 2 ? usersOnly : [];
        if (owner && pair.length === 2 && pair.includes(owner)) {
          const other = pair.find((u) => u !== owner);
          if (other) {
            sellerId = owner;
            buyerId = other;
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  if (!sellerId || !buyerId || sellerId === buyerId) return;

  const sortedPair = [sellerId, buyerId].sort((x, y) => x.localeCompare(y));
  const u0 = sortedPair[0]!;
  const u1 = sortedPair[1]!;

  const usersArr = strArr(d.users);
  const partsArr = strArr(d.participants);

  const sameSortedPair = (arr: string[]) => matchesSortedPairArrays(arr, u0, u1);

  if (sameSortedPair(usersArr) && sameSortedPair(partsArr)) return;

  try {
    await updateDoc(ref, {
      sellerId,
      buyerId,
      users: [u0, u1],
      participants: [u0, u1],
      updatedAt: serverTimestamp(),
    });
    if (import.meta.env.DEV) {
      console.log("[chatService] ensureTradeChatParticipants: participants/users 정규화", {
        chatId: cid,
        sellerId,
        buyerId,
      });
    }
  } catch (e) {
    console.warn("[chatService] ensureTradeChatParticipants 실패:", e);
  }
}

/**
 * `/app/chat/:id` 의 문서 ID가 `postId_uidA_uidB` 형태일 때(마지막 두 세그먼트 = Firebase UID) 파싱.
 * postId 자체에 `_` 가 포함된 경우에도 마지막 두 토큰을 UID로 본다.
 */
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

/**
 * 거래 1:1 라우트 ID가 `postId_uid_uid` 패턴일 때, `buildChatId`와 동일한 정규 문서 ID.
 * (레거시 `postId_seller_buyer` 순과 무관하게 항상 두 UID 문자열 정렬 결과.)
 */
export function canonicalTradeChatDocumentIdFromRoute(rid: string): string | null {
  const p = parseTradeChatDocumentIdRoute(rid);
  if (!p) return null;
  try {
    return buildChatId(p.postId, p.uidA, p.uidB);
  } catch {
    return null;
  }
}

/** 판매자 화면에서 구매자 UID 추론: buyerId 필드 → participants/users → 문서 ID 파싱 */
function inferBuyerUidForListingOwner(
  routeChatId: string,
  listingOwner: string,
  snap: DocumentSnapshot | null
): string {
  const owner = String(listingOwner ?? "").trim();
  if (!owner) return "";

  if (snap?.exists()) {
    const d = snap.data() as Record<string, unknown>;
    const buyerField = String(d.buyerId ?? "").trim();
    if (buyerField && buyerField !== owner) return buyerField;

    const set = participantUidsFromChatDoc(d);
    set.delete(owner);
    const others = [...set].filter((x) => x && x !== owner);
    /** 참가자가 소유자 외 1명뿐일 때만 안전하게 구매자로 간주 (여러 명이면 문서 ID 파싱으로 후퇴) */
    if (others.length === 1) return others[0]!;
  }

  const parsed = parseTradeChatDocumentIdRoute(routeChatId);
  if (!parsed) return "";
  if (parsed.uidA === owner) return parsed.uidB;
  if (parsed.uidB === owner) return parsed.uidA;
  return "";
}

/**
 * 라우트의 `chats/{id}`와 동일 거래 스레드에서 우선할 문서 ID (레거시·중복 ID 정리).
 * 게시글 소유자(`resolveListingOwnerUid`) 기준으로 거래 쌍을 고정해 양쪽이 같은 방으로 수렴.
 * null 이면 현재 URL 유지.
 */
export async function resolvePreferredTradeChatDocumentId(
  routeChatId: string,
  viewerUid: string
): Promise<string | null> {
  const rid = String(routeChatId ?? "").trim();
  const uid = String(viewerUid ?? "").trim();
  if (!rid || !uid) return null;

  /** 게시글 소유자 조회 전에: URL만 레거시 순서인데 정규 방 문서가 이미 있으면 즉시 수렴 */
  const parsedRoute = parseTradeChatDocumentIdRoute(rid);
  if (
    parsedRoute &&
    (parsedRoute.uidA === uid || parsedRoute.uidB === uid)
  ) {
    try {
      const quickCanon = buildChatId(parsedRoute.postId, parsedRoute.uidA, parsedRoute.uidB);
      if (quickCanon !== rid) {
        const canonSnap = await safeGetChatSnap(quickCanon);
        if (canonSnap?.exists()) {
          const d = canonSnap.data() as Record<string, unknown>;
          if (chatDocContainsPair(d, parsedRoute.uidA, parsedRoute.uidB)) {
            return quickCanon;
          }
        }
      }
    } catch {
      /* 아래 전체 분기로 진행 */
    }
  }

  const snap = await safeGetChatSnap(rid);
  let postId = "";
  if (snap?.exists()) {
    postId = String((snap.data() as Record<string, unknown>).postId ?? "").trim();
  }
  if (!postId) {
    const parsed = parseTradeChatDocumentIdRoute(rid);
    if (parsed) postId = parsed.postId;
  }
  if (!postId) return null;

  const listingOwner = await resolveListingOwnerUid(postId);

  let sellerFinal = "";
  let buyerFinal = "";

  if (listingOwner) {
    sellerFinal = listingOwner;
    if (uid === listingOwner) {
      buyerFinal = inferBuyerUidForListingOwner(rid, listingOwner, snap);
    } else {
      buyerFinal = uid;
    }
  } else {
    let s = "";
    let b = "";
    if (snap?.exists()) {
      const d = snap.data() as Record<string, unknown>;
      s = String(d.sellerId ?? "").trim();
      b = String(d.buyerId ?? "").trim();
    }
    if (!s || !b) {
      const parsed = parseTradeChatDocumentIdRoute(rid);
      if (parsed) {
        s = parsed.uidA;
        b = parsed.uidB;
      }
    }
    sellerFinal = s;
    buyerFinal = b;
  }

  if (!sellerFinal || !buyerFinal || sellerFinal === buyerFinal) return null;
  if (uid !== sellerFinal && uid !== buyerFinal) return null;

  let canonicalId: string;
  try {
    canonicalId = buildChatId(postId, sellerFinal, buyerFinal);
  } catch {
    return null;
  }

  /** URL이 레거시 순서(`postId_seller_buyer`) 등 비정규 ID인데 정규 문서가 이미 있으면 즉시 이동 */
  if (rid !== canonicalId) {
    const canonSnap = await safeGetChatSnap(canonicalId);
    if (canonSnap?.exists()) {
      const d = canonSnap.data() as Record<string, unknown>;
      if (chatDocContainsPair(d, sellerFinal, buyerFinal)) {
        return canonicalId;
      }
    }
  }

  const aliasFromSnap = new Set<string>();
  aliasFromSnap.add(postId);
  if (snap?.exists()) {
    const d = snap.data() as Record<string, unknown>;
    const lid = String(d.listingId ?? "").trim();
    if (lid) aliasFromSnap.add(lid);
    const prod = d.product as { id?: string } | undefined;
    if (prod?.id && typeof prod.id === "string") aliasFromSnap.add(prod.id.trim());
    const dp = String(d.postId ?? "").trim();
    if (dp) aliasFromSnap.add(dp);
  }

  const hit = await pickBestTradeChatForPair(postId, sellerFinal, buyerFinal, uid, aliasFromSnap);
  if (!hit || hit.chatId === rid) return null;
  return hit.chatId;
}

export async function getOrCreateChat(params: CreateChatParams) {
  const {
    postTitle,
    postImage,
    sport,
    sellerId,
    buyerId: buyerIdParam,
    sellerName,
    buyerName,
    sellerAvatar,
    buyerAvatar,
    listingId,
    productPrice,
    productCategory,
  } = params;

  let postId = String(params.postId ?? "").trim();
  const listingIdNorm = listingId ? String(listingId).trim() : "";
  if (listingIdNorm && listingIdNorm !== postId) {
    const resolved = await resolveTradeChatPostIdForMarketHub(postId, listingIdNorm);
    if (resolved !== postId && import.meta.env.DEV) {
      console.warn("[chatService] getOrCreateChat: postId ↔ listingId 불일치 → marketPosts 기준으로 통일", {
        before: postId,
        listingId: listingIdNorm,
        after: resolved,
      });
    }
    postId = resolved;
  }

  /** lookup 시 문서의 postId / listingId / product.id 어느 쪽과도 매칭 (옛 방이 다른 키로 저장된 경우) */
  const listingLookupAliases = new Set<string>();
  listingLookupAliases.add(postId);
  if (listingIdNorm) listingLookupAliases.add(listingIdNorm);
  const rawPostIn = String(params.postId ?? "").trim();
  if (rawPostIn) listingLookupAliases.add(rawPostIn);

  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("로그인이 필요합니다.");
  }
  // Rules·Firestore 문자열 일치: 문서에 숫자/공백 혼입 시 참가자 판별 실패 방지
  const sellerFromParam = String(sellerId ?? "").trim();
  const buyerNormRaw = String(buyerIdParam ?? "").trim();

  if (!sellerFromParam) {
    throw new Error("판매자 정보가 올바르지 않습니다.");
  }

  let listingOwner = await resolveListingOwnerUid(postId);
  if (!listingOwner) {
    for (const aid of listingLookupAliases) {
      const a = String(aid ?? "").trim();
      if (!a || a === postId) continue;
      const o = await resolveListingOwnerUid(a);
      if (o) {
        listingOwner = o;
        break;
      }
    }
  }

  let sellerFinal = String(listingOwner || sellerFromParam || "").trim();

  if (listingOwner && sellerFromParam && listingOwner !== sellerFromParam) {
    console.warn("[chatService] getOrCreateChat: 클라이언트 sellerId와 게시글 소유자 불일치 → Firestore 게시글 기준으로 통일", {
      postId,
      sellerFromParam,
      listingOwner,
    });
  }

  if (!sellerFinal) {
    throw new Error("판매자 정보가 올바르지 않습니다.");
  }

  let buyerFinal: string;

  if (uid === sellerFinal) {
    // 판매자가 목록 등에서 방 생성/복구 — 상대 UID는 buyerIdParam 필수
    if (!buyerNormRaw || buyerNormRaw === sellerFinal) {
      throw new Error("구매자 정보가 올바르지 않습니다.");
    }
    buyerFinal = buyerNormRaw;
  } else {
    // 일반: 상품 상세에서 구매자가 시작 — 현재 사용자가 구매자
    buyerFinal = uid;
    if (buyerNormRaw && buyerNormRaw !== uid) {
      console.warn("[chatService] getOrCreateChat: buyerIdParam과 로그인 uid 불일치, uid를 구매자로 사용", {
        buyerIdParam,
        uid,
      });
    }
  }

  if (sellerFinal === buyerFinal) {
    throw new Error("판매자와 구매자가 동일할 수 없습니다.");
  }

  if (uid !== sellerFinal && uid !== buyerFinal) {
    throw new Error("이 거래 채팅의 참가자만 이용할 수 있습니다.");
  }

  const canonicalForLog = buildChatId(postId, sellerFinal, buyerFinal);
  if (import.meta.env.DEV) {
    const sortedPair = [sellerFinal, buyerFinal].sort();
    console.log("[chatService] getOrCreateChat lookup", {
      canonicalPostId: postId,
      listingLookupAliases: [...listingLookupAliases],
      viewerUid: uid,
      sellerFinal,
      buyerFinal,
      sortedPair,
      canonicalChatId: canonicalForLog,
    });
  }

  let existing = await pickBestTradeChatForPair(postId, sellerFinal, buyerFinal, uid, listingLookupAliases);

  /** 레거시: sellerId·문서 ID가 SSOT와 달라 엄격 매칭만으로는 방을 못 찾는 경우 — 구매자·글 별칭 일치 2인 방으로 수렴 */
  if (!existing && uid === buyerFinal) {
    const relaxedDocs = await findTradeChatDocsBuyerListingRelaxed(
      listingLookupAliases,
      buyerFinal,
      uid
    );
    const picked = pickBestRelaxedTradeChatForBuyer(relaxedDocs, buyerFinal, sellerFinal);
    if (picked) {
      existing = { chatId: picked.id, snap: picked };
      if (import.meta.env.DEV) {
        console.warn("[chatService] getOrCreateChat: 레거시 거래 방 완화 매칭으로 수렴", {
          pickedChatId: picked.id,
          buyerFinal,
          trustedSeller: sellerFinal || null,
        });
      }
    }
  }

  const canonicalId = canonicalForLog;
  const chatId = existing?.chatId ?? canonicalId;
  const chatRef = doc(db, "chats", chatId);
  let snap: DocumentSnapshot;
  if (existing?.snap) {
    snap = existing.snap;
  } else {
    const s = await safeGetChatSnap(chatId);
    if (!s) {
      throw new Error(
        "이 거래 채팅방 문서에 접근할 수 없습니다. 다른 계정으로 만들어진 방이거나 데이터 정리가 필요할 수 있습니다."
      );
    }
    snap = s;
  }

  const resolvedListingId = listingId ?? postId;

  if (!snap.exists()) {
    /** 문서 ID(`buildChatId`)와 동일하게 UID 문자열 정렬 — 레거시 `seller,buyer` 순과 혼동 방지 */
    const pairSorted = [sellerFinal, buyerFinal].sort((x, y) => x.localeCompare(y));
    /**
     * 배치로 묶으면 규칙이 각 쓰기를 따로 평가할 때 부모 chats가 아직 없어
     * messages create(chatParticipantByChatId)가 전부 permission-denied 난다.
     * 부모 커밋 후 첫 메시지 추가.
     */
    await setDoc(chatRef, {
      postId,
      listingId: resolvedListingId,
      postTitle,
      postImage: postImage ?? "",
      sport: (sport || "all").toLowerCase(),
      sellerId: sellerFinal,
      buyerId: buyerFinal,
      participants: pairSorted,
      /** rules·레거시 리스너 호환 (participants와 동일 멤버) */
      users: pairSorted,
      product: {
        id: postId,
        name: postTitle,
        imageUrl: postImage ?? "",
        ...(productPrice != null && Number.isFinite(productPrice)
          ? { price: productPrice }
          : {}),
        ...(productCategory ? { category: productCategory } : {}),
      },
      participantsInfo: {
        [sellerFinal]: { name: sellerName || "판매자", avatar: sellerAvatar || "" },
        [buyerFinal]: { name: buyerName || "구매자", avatar: buyerAvatar || "" },
      },
      /** 방을 연 사람 = 현재 로그인 uid (규칙: senderId == auth.uid, 판매자가 먼저 열어도 동일) */
      unreadCount: {
        [uid]: 0,
        [uid === sellerFinal ? buyerFinal : sellerFinal]: 1,
      },
      tradeStatus: "active" as const,
      // 🔥 lastMessage를 객체로 유지 (확장성/표시 일관성)
      lastMessage: {
        text: "채팅이 시작되었습니다.",
        senderId: uid,
        type: "text",
        createdAt: serverTimestamp(),
      },
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: uid,
      lastMessageRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "active" as const,
    });

    const tm = sortedTradeThreadMemberIds(sellerFinal, buyerFinal);
    const firstMsg = {
      senderId: uid,
      text: "채팅이 시작되었습니다.",
      type: "text",
      createdAt: serverTimestamp(),
      readBy: [uid],
      system: true,
      ...(tm ? { threadMemberIds: tm } : {}),
    };
    const msgCol = collection(db, "chats", chatId, "messages");
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await addDoc(msgCol, firstMsg);
        break;
      } catch (e) {
        if (isFirestorePermissionDenied(e) && attempt < 3) {
          await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }
  } else {
    // 레거시/부분 실패 문서: buyer·seller는 맞는데 users/participants 타입이 깨져 규칙 `in` 평가가 전부 거부되는 경우 백필
    const d = snap.data() as Record<string, unknown>;
    const ds = String(d.sellerId ?? "").trim();
    const dbuy = String(d.buyerId ?? "").trim();
    const usersOk =
      Array.isArray(d.users) && d.users.includes(buyerFinal) && d.users.includes(sellerFinal);
    const partOk =
      Array.isArray(d.participants) &&
      (d.participants as unknown[]).includes(buyerFinal) &&
      (d.participants as unknown[]).includes(sellerFinal);
    if (ds === sellerFinal && dbuy === buyerFinal && !usersOk && !partOk) {
      try {
        const pairSorted = [sellerFinal, buyerFinal].sort((x, y) => x.localeCompare(y));
        await updateDoc(chatRef, {
          sellerId: sellerFinal,
          buyerId: buyerFinal,
          users: pairSorted,
          participants: pairSorted,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn("[chatService] chats 메타 백필 실패:", e);
      }
    }
  }

  /** 호출부 라우트는 실제 읽기·쓰기에 쓴 문서 ID와 동일해야 함 (레거시 방 완화 매칭 시 canonical과 다를 수 있음) */
  return { chatId };
}

// 🔥 단일 진입: 텍스트 메시지 전송 + unread/lastMessage 갱신
export async function sendMessage(params: {
  chatId: string;
  senderId: string;
  receiverId?: string | null;
  text: string;
  postId?: string | null;
}): Promise<void> {
  const { chatId, senderId, receiverId, text } = params;
  const trimmed = (text || "").trim();
  if (!chatId || !senderId || !trimmed) return;

  const tm = await fetchTradeThreadMemberIdsForChat(chatId);
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId,
    type: "text",
    text: trimmed,
    createdAt: serverTimestamp(),
    readBy: { [senderId]: serverTimestamp() }, // ✅ 확장 가능한 읽음 구조
    ...(tm ? { threadMemberIds: tm } : {}),
  });

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: {
      text: trimmed,
      senderId,
      type: "text",
      createdAt: serverTimestamp(),
    },
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageSenderId: senderId,
    lastMessageRead: false,
    ...(receiverId ? { [`unreadCount.${receiverId}`]: increment(1) } : {}),
    [`unreadCount.${senderId}`]: 0,
    [`readBy.${senderId}`]: serverTimestamp(),
  });
}

/**
 * 거래 채팅 `chats/{chatId}` 읽음 처리.
 * - `readBy.{userId}` = 상대가 보는 “내 읽음 커서”(시간) — ChatRoom `peerReadCursor`와 직결
 * - 호출: 방 진입, 스크롤 하단 근접, 수신 메시지 배치 읽음 후
 */
export async function markAsRead(chatId: string, userId: string): Promise<void> {
  if (!chatId || !userId) return;
  try {
    await updateDoc(doc(db, "chats", chatId), {
      [`unreadCount.${userId}`]: 0,
      lastMessageRead: true,
      updatedAt: serverTimestamp(),
      [`readBy.${userId}`]: serverTimestamp(),
    });
  } catch {
    // 읽음 처리 실패는 사용자에게 노출하지 않음
  }
}
