import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { db } from "../../lib/firebase";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthProvider";
import {
  buildChatId,
  canonicalTradeChatDocumentIdFromRoute,
  ensureTradeChatParticipants,
  markAsRead,
  normalizeTradeChatDocumentIdForRoute,
  resolveListingOwnerUid,
  resolvePreferredTradeChatDocumentId,
} from "@/features/chat/services/chatService";
import {
  callEnsureCanonicalTradeChat,
  type CallEnsureCanonicalTradeChatOutcome,
} from "@/lib/chat/callEnsureCanonicalTradeChat";
import { mirrorTradeChatRoomLastMessage } from "@/lib/chat/mirrorTradeChatRoomLastMessage";
import { ChatPanelAttachButton } from "@/components/chat/ChatPanelAttachButton";
import { ChatImageLightbox } from "@/components/chat/ChatImageLightbox";
import {
  createdAtToDate,
  formatChatListDateLabel,
  formatChatListTime,
  sameCalendarDay,
} from "@/lib/chat/inlineChatListFormat";
import { peerHasReadMyMessage, readByUids } from "@/lib/chat/peerReadReceipt";
import { usePaginatedMessages } from "@/hooks/usePaginatedMessages";
import { cleanFirestoreData } from "@/utils/firestoreHelpers";
import { notifyTradeChatRecipient } from "@/lib/chat/notifyTradeChatRecipient";
import { fetchTradeThreadMemberIdsForChat } from "@/lib/chat/tradeChatThreadMemberIds";
import { markNotificationsReadForChat } from "@/lib/notifications/markNotificationsReadForChat";
import { cn } from "@/lib/utils";

function assignMessageRowEl(
  map: MutableRefObject<Record<string, HTMLDivElement | null>>,
  messageId: string,
  el: HTMLDivElement | null
) {
  const id = String(messageId ?? "").trim();
  if (!id) return;
  if (el) map.current[id] = el;
  else delete map.current[id];
}

function toErrorDetail(error: unknown): { code: string; message: string } {
  const fallback = { code: "unknown", message: "알 수 없는 오류" };
  if (!error || typeof error !== "object") return fallback;
  const code = String((error as { code?: unknown }).code ?? "unknown");
  const message = String((error as { message?: unknown }).message ?? "알 수 없는 오류");
  return { code, message };
}

function toastTradeChatWriteDenied(code: string, kind: "text" | "offer"): void {
  if (code === "permission-denied") {
    const hint =
      "상품 상세에서 「채팅하기」를 다시 눌러 입장하거나, 채팅 목록에서 이 거래 방을 여세요. (서로 다른 채팅 문서를 보고 있으면 전송이 막힙니다.)";
    toast.error(kind === "offer" ? `가격 제안을 보낼 권한이 없습니다. ${hint}` : `메시지를 보낼 권한이 없습니다. ${hint}`);
    return;
  }
  toast.error(kind === "offer" ? `가격 제안 전송 실패: ${code}` : `메시지 전송 실패: ${code}`);
}

function pickPriceFromDoc(data: any): number {
  if (!data || typeof data !== "object") return 0;
  const raw = data.price ?? data.sellingPrice ?? data.salePrice ?? data.amount;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string") {
    const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

async function fetchListingPriceFallback(listingId: string): Promise<number> {
  for (const col of ["marketProducts", "marketPosts", "market"] as const) {
    try {
      const snap = await getDoc(doc(db, col, listingId));
      if (snap.exists()) {
        const p = pickPriceFromDoc(snap.data());
        if (p > 0) return p;
      }
    } catch {
      /* ignore */
    }
  }
  return 0;
}

/** chats 문서에서 거래 상대 추론용 UID 집합 (users/participants/seller/buyer 합집합) */
function participantUidSetFromChatDoc(data: Record<string, unknown>): Set<string> {
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

/** 거래 메타에서 두 참가자 UID — buildChatId 정렬 전 원본 (역할 순서 무관) */
async function resolveTradePairUidsForCanonical(
  chatData: Record<string, unknown>,
  postId: string,
  myUid: string
): Promise<{ u1: string; u2: string } | null> {
  const pid = String(postId ?? "").trim();
  const me = String(myUid ?? "").trim();
  if (!pid || !me) return null;

  const s = String(chatData.sellerId ?? "").trim();
  const b = String(chatData.buyerId ?? "").trim();
  if (s && b && s !== b) return { u1: s, u2: b };

  const uidSet = participantUidSetFromChatDoc(chatData);
  if (uidSet.size === 2) {
    try {
      const lo = await resolveListingOwnerUid(pid);
      if (lo && uidSet.has(lo)) {
        const other = [...uidSet].find((u) => u !== lo);
        if (other) return { u1: lo, u2: other };
      }
    } catch {
      /* ignore */
    }
    const sorted = [...uidSet].sort((x, y) => x.localeCompare(y));
    return { u1: sorted[0]!, u2: sorted[1]! };
  }

  const owner = await resolveListingOwnerUid(pid);
  if (owner && me !== owner) return { u1: owner, u2: me };
  if (owner && me === owner) {
    const ob = (b && b !== owner ? b : "") || (s && s !== owner ? s : "");
    if (ob) return { u1: owner, u2: ob };
  }
  return null;
}

/** 판매자가 제안 수락 시: listingId가 속한 컬렉션에 예약 반영 (market 우선) */
async function tryReserveListingForBuyer(listingId: string, buyerUid: string): Promise<boolean> {
  const order = ["market", "marketPosts", "marketProducts"] as const;
  for (const col of order) {
    try {
      const ref = doc(db, col, listingId);
      const snap = await getDoc(ref);
      if (!snap.exists()) continue;
      const payload: Record<string, unknown> = {
        status: "reserved",
        reservedBy: buyerUid,
        reservedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (col !== "marketProducts") {
        payload.buyerId = buyerUid;
      }
      await updateDoc(ref, payload);
      return true;
    } catch (e) {
      console.warn(`[ChatRoom] 상품 예약 갱신 실패 (${col}):`, e);
    }
  }
  return false;
}

/** 거래 스레드 `chats/.../messages` 작성자 uid — 필드 편차 흡수, 판별은 이 함수만 사용 */
function coerceAuthorUid(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const v = value.trim();
    if (!v || v === "undefined" || v === "null") return null;
    return v;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return null;
}

/** Callable 실패를 조용히 삼키지 않음 — 권한·로그인·전제조건 위반은 사용자에게 한 번 안내 */
function notifyEnsureCanonicalTradeChatFailure(out: CallEnsureCanonicalTradeChatOutcome): void {
  if (out.ok) return;
  const code = out.code ?? "";
  const msg = (out.message ?? "").toLowerCase();
  if (code.includes("unauthenticated")) {
    toast.error("거래 채팅 정리에 로그인이 필요합니다. 다시 로그인한 뒤 채팅을 열어 주세요.");
    return;
  }
  if (code.includes("permission-denied")) {
    toast.error(
      "이 방은 서버에서 통합할 수 없거나 참가자가 아닙니다. 채팅 목록에서 해당 거래 방을 다시 선택해 주세요."
    );
    return;
  }
  if (code.includes("failed-precondition") || msg.includes("postid")) {
    toast.message("거래 정보를 확인할 수 없어 방 통합을 건너뛰었습니다.");
    return;
  }
  if (import.meta.env.DEV) {
    toast.message(
      `[DEV] ensureCanonicalTradeChat 실패: ${code || out.reason}${out.message ? ` — ${out.message}` : ""}`
    );
  }
}

function messageAuthorUid(m: any): string {
  const keys = [
    "senderId",
    "uid",
    "userId",
    "authorId",
    "fromUserId",
    "fromUid",
    "createdBy",
  ] as const;
  for (const k of keys) {
    const s = coerceAuthorUid(m?.[k]);
    if (s) return s;
  }
  return "";
}

function isMessageMine(m: any, myUid: string | undefined | null): boolean {
  const me = String(myUid ?? "").trim();
  if (!me) return false;
  return messageAuthorUid(m) === me;
}

/** 소프트 삭제 — `deletedBy`만 있는 레거시는 제외(오탐 방지) */
function isMessageDeleted(m: { deleted?: boolean; isDeleted?: boolean; deletedAt?: unknown } | null | undefined): boolean {
  if (!m) return false;
  return m.deleted === true || m.isDeleted === true || Boolean(m.deletedAt);
}

/** 내 말풍선 — 카톡/라인에 가까운 낮은 채도 블루 */
const BUBBLE_MINE =
  "bg-[#dbeafe] text-[#1e3a8a] ring-1 ring-blue-100/90 dark:bg-blue-950/45 dark:text-blue-100 dark:ring-blue-800/45";
/** 상대 말풍선 */
const BUBBLE_OTHER =
  "bg-[#f3f4f6] text-gray-900 ring-1 ring-gray-200/90 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600/60";
/** 가격 제안 — 일반 말풍선과 구분되는 액션 카드 */
const OFFER_CARD =
  "rounded-xl border border-[#fdba74] bg-[#fff7ed] p-2.5 text-amber-950 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:border-amber-600/90 dark:bg-amber-950/35 dark:text-amber-50 dark:shadow-[0_1px_2px_rgba(0,0,0,0.25)]";

function toRenderableText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function safeText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return "";
  return String(value);
}

function toMillisSafe(value: unknown): number {
  if (value && typeof value === "object") {
    const rec = value as { toMillis?: () => number; toDate?: () => Date; seconds?: number };
    if (typeof rec.toMillis === "function") {
      const ms = rec.toMillis();
      return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof rec.toDate === "function") {
      const dt = rec.toDate();
      const ms = dt instanceof Date ? dt.getTime() : NaN;
      return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof rec.seconds === "number" && Number.isFinite(rec.seconds)) {
      return rec.seconds * 1000;
    }
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

type TradeMessage = (Record<string, unknown> & { id?: string; createdAt?: unknown }) | null;

type TradeMessageGroup = {
  startIndex: number;
  items: NonNullable<TradeMessage>[];
};

/** 같은 작성자·같은 날 + 직전 메시지와 10분 이내 → 한 대화 묶음 (카톡식 그룹) */
const TRADE_GROUP_MAX_GAP_MS = 10 * 60 * 1000;

function buildTradeMessageGroups(messages: NonNullable<TradeMessage>[]): TradeMessageGroup[] {
  if (messages.length === 0) return [];
  const groups: TradeMessageGroup[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const prev = i > 0 ? messages[i - 1] : null;
    const currAuthor = messageAuthorUid(m);
    const prevAuthor = prev ? messageAuthorUid(prev) : "";
    const currD = createdAtToDate(m?.createdAt);
    const prevD = prev ? createdAtToDate(prev.createdAt) : null;
    const dayBreak =
      Boolean(prev) && Boolean(currD) && Boolean(prevD) && !sameCalendarDay(currD!, prevD!);
    const authorBreak = !prev || currAuthor !== prevAuthor;
    const tCurr = toMillisSafe(m?.createdAt);
    const tPrev = prev ? toMillisSafe(prev.createdAt) : 0;
    const timeBreak = Boolean(prev) && tCurr - tPrev > TRADE_GROUP_MAX_GAP_MS;

    if (!prev || dayBreak || authorBreak || timeBreak) {
      groups.push({ startIndex: i, items: [m] });
    } else {
      groups[groups.length - 1]!.items.push(m);
    }
  }
  return groups;
}

/** prepend 시 startIndex가 밀려도 동일 그룹 키 유지 (Virtuoso computeItemKey) */
function tradeGroupStableKey(group: TradeMessageGroup): string {
  const first = group.items[0];
  const last = group.items[group.items.length - 1];
  const a = String(first?.id ?? "").trim();
  const b = String(last?.id ?? "").trim();
  if (a && b) return `g:${a}:${b}`;
  return `g:${group.startIndex}:${messageAuthorUid(first as NonNullable<TradeMessage>)}`;
}

function isTradeImageMessage(m: NonNullable<TradeMessage>): boolean {
  if ((m as { type?: string }).type !== "image") return false;
  return typeof (m as { imageUrl?: unknown }).imageUrl === "string" && !!(m as { imageUrl: string }).imageUrl;
}

function isTradeFileMessage(m: NonNullable<TradeMessage>): boolean {
  if ((m as { type?: string }).type !== "file") return false;
  return typeof (m as { fileUrl?: unknown }).fileUrl === "string" && !!(m as { fileUrl: string }).fileUrl;
}

function formatChatFileSize(bytes: unknown): string {
  const n = typeof bytes === "number" && Number.isFinite(bytes) ? bytes : 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateFileDisplayName(name: string, max = 36): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

function isTradeOfferMessage(m: NonNullable<TradeMessage>): boolean {
  return (m as { type?: string }).type === "offer";
}

type TradeSegment =
  | { kind: "textRun"; messages: NonNullable<TradeMessage>[] }
  | { kind: "single"; message: NonNullable<TradeMessage> };

/** 묶음 안에서 연속 일반 텍스트 → 렌더 시 말풍선 하나로 합침 */
function segmentTradeGroupItems(items: NonNullable<TradeMessage>[]): TradeSegment[] {
  const segments: TradeSegment[] = [];
  let i = 0;
  while (i < items.length) {
    const m = items[i]!;
    if (isMessageDeleted(m)) {
      segments.push({ kind: "single", message: m });
      i++;
      continue;
    }
    if (isTradeOfferMessage(m) || isTradeImageMessage(m) || isTradeFileMessage(m)) {
      segments.push({ kind: "single", message: m });
      i++;
      continue;
    }
    const run: NonNullable<TradeMessage>[] = [m];
    i++;
    while (i < items.length) {
      const n = items[i]!;
      if (
        isMessageDeleted(n) ||
        isTradeOfferMessage(n) ||
        isTradeImageMessage(n) ||
        isTradeFileMessage(n)
      )
        break;
      run.push(n);
      i++;
    }
    segments.push({ kind: "textRun", messages: run });
  }
  return segments;
}

export default function ChatRoom() {
  const { id: routeChatId } = useParams();
  /** 라우트 파라미터 공백·undefined 방지 + Firestore 경로는 반드시 세그먼트 분리 */
  const chatId = (routeChatId ?? "").trim();
  const navigate = useNavigate();

  /** 레거시 URL: `trade_*` 제거 + `post_uid_uid`를 buildChatId 정규 문자열로 통일 (빈 chats 방만 보는 문제 방지) */
  useEffect(() => {
    if (!chatId) return;
    let target = normalizeTradeChatDocumentIdForRoute(chatId);
    const canon = canonicalTradeChatDocumentIdFromRoute(target);
    if (canon) target = canon;
    if (target !== chatId) {
      navigate(`/app/chat/${target}`, { replace: true });
    }
  }, [chatId, navigate]);
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightMessageId = searchParams.get("messageId")?.trim() || null;
  const messageRowElsRef = useRef<Record<string, HTMLDivElement | null>>({});
  /** 동일 `?messageId=` 세션에서 스크롤·강조는 1회만 (이후 `messages` 갱신으로 재트리거 방지) */
  const deepLinkHighlightSessionRef = useRef<{ key: string | null; handled: boolean }>({
    key: null,
    handled: false,
  });
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [offerDraft, setOfferDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [aiReply, setAiReply] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [aiPrice, setAiPrice] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRisk, setAiRisk] = useState<"low" | "medium" | "high" | null>(null);
  const [aiRiskReason, setAiRiskReason] = useState("");
  const [product, setProduct] = useState<{
    title: string;
    price: number;
    category: string;
    conditionLabel: string;
    summary: string;
    aiOneLine: string;
    imageUrl?: string;
    counterpartName?: string;
    /** `/app/market/:id` 리다이렉트용 (marketProducts / marketPosts id) */
    listingId?: string | null;
  } | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  /** chats.readBy[상대] — 상대가 방을 읽은 시각(커서). 메시지 readBy와 병합해 읽음 표시 */
  const [peerReadCursor, setPeerReadCursor] = useState<unknown>(null);
  const [imageLightboxSrc, setImageLightboxSrc] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  /** prepend(이전 메시지 로드) 시 스크롤 앵커 유지 — https://virtuoso.dev/prepend-items/ */
  const [virtuosoFirstItemIndex, setVirtuosoFirstItemIndex] = useState(0);
  const prevLoadingOlderRef = useRef(false);
  const messageGroupsSnapshotWhenOlderStartedRef = useRef(0);
  /** 이미지 연속 onLoad 시 autoscroll RAF 1프레임으로 합침 */
  const imageAutoscrollRafRef = useRef<number | null>(null);
  /** 꼬리 마지막 메시지 id (하단 밖에 있을 때 신규 도착 감지) */
  const prevTailLastIdRef = useRef<string | undefined>(undefined);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  /** 스크롤 기반 markAsRead 스로틀(ms) — readBy 커서 과다 쓰기 방지 */
  const lastScrollMarkReadAtRef = useRef(0);
  /** 하단 근처일 때만 신규 메시지에 자동 스크롤 */
  const nearBottomRef = useRef(true);
  /** 채팅 리스트 하단 앵커 ref */
  const bottomRef = useRef<HTMLDivElement | null>(null);
  /** 스크롤이 하단 근처인지 (새 메시지 칩 표시용) */
  const [atBottom, setAtBottom] = useState(true);
  /** 하단 밖에 있는 동안 꼬리에 새 메시지가 붙었을 때만 칩 표시 */
  const [unseenTailWhileScrolledUp, setUnseenTailWhileScrolledUp] = useState(false);
  /** 거래방에서 작성자 1명 패턴일 때 서버 병합 재시도 1회만 */
  const tradeMergeRetryAfterSingleAuthorRef = useRef(false);
  /** FINAL CHAT PATH 콘솔 — 동일 분량·동일 작성자면 참조만 바뀐 재렌더에서 반복 로그 방지 */
  const finalPathLogKeyRef = useRef("");
  /**
   * 거래 `post_uid_uid` 방: participants/users 보정 후 메시지 onSnapshot 연결.
   * 보정 전에 리스너를 붙이면 rules에서 permission-denied → 빈 목록으로 고착되는 경우가 있음.
   */
  const [tradeAclPrimed, setTradeAclPrimed] = useState(false);
  /** 메시지 컬렉션 listen 이 permission-denied 일 때만 안내 배너 표시 */
  const [tradeMessagesPermissionDenied, setTradeMessagesPermissionDenied] = useState(false);

  useEffect(() => {
    setTradeMessagesPermissionDenied(false);
  }, [chatId]);

  /** 모든 거래 방: participants 백필 후 메시지 리스너 연결 (비정규 ID·레거시 문서도 동일 — 리스너가 rules보다 먼저 붙어 permission-denied 나는 것 방지) */
  useEffect(() => {
    if (!chatId) {
      setTradeAclPrimed(false);
      return;
    }
    let cancelled = false;
    setTradeAclPrimed(false);
    void (async () => {
      try {
        await ensureTradeChatParticipants(chatId);
      } finally {
        if (!cancelled) setTradeAclPrimed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const messagesRoomId = chatId && tradeAclPrimed ? chatId : "";

  const onTradeMessagesListenError = useCallback((err: unknown) => {
    const code =
      err && typeof err === "object" && "code" in err ? String((err as { code?: unknown }).code) : "";
    if (code === "permission-denied") {
      setTradeMessagesPermissionDenied(true);
      toast.error(
        "이 방 메시지를 읽을 권한이 없습니다. 상품에서 「채팅하기」로 다시 들어오거나, 같은 거래의 다른 채팅방으로 이동했는지 확인해 주세요."
      );
      return;
    }
    toast.message("메시지 목록을 불러오지 못했습니다. 네트워크를 확인 후 새로고침 해 주세요.");
  }, []);

  const {
    messages: msgs,
    tailLastId,
    hasMoreOlder,
    loadingOlder,
    loadOlderMessages,
  } = usePaginatedMessages({
    channel: "chats",
    roomId: messagesRoomId,
    tailSize: 50,
    olderPageSize: 30,
    onListenError: onTradeMessagesListenError,
  });
  const messages = useMemo(() => {
    const deduped = Array.from(
      new Map(msgs.map((m) => [String(m?.id ?? ""), m])).values()
    ).filter((m) => String(m?.id ?? "").length > 0);
    deduped.sort((a, b) => toMillisSafe(a?.createdAt) - toMillisSafe(b?.createdAt));
    return deduped;
  }, [msgs]);
  const messageGroups = useMemo(
    () => buildTradeMessageGroups(messages as NonNullable<TradeMessage>[]),
    [messages]
  );
  const lastMyMessageId = useMemo(() => {
    return (
      [...messages].reverse().find((m) => isMessageMine(m, user?.uid))?.id ?? null
    );
  }, [messages, user?.uid]);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const n = messageGroups.length;
    if (n < 1) return;
    virtuosoRef.current?.scrollToIndex({
      index: n - 1,
      align: "end",
      behavior,
    });
    nearBottomRef.current = true;
    setAtBottom(true);
    setUnseenTailWhileScrolledUp(false);
  }, [messageGroups.length]);

  useLayoutEffect(() => {
    const ta = messageInputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [text]);

  useEffect(() => {
    if (!chatId) return;
    nearBottomRef.current = true;
    setAtBottom(true);
    setVirtuosoFirstItemIndex(0);
    prevLoadingOlderRef.current = false;
    prevTailLastIdRef.current = undefined;
    setUnseenTailWhileScrolledUp(false);
  }, [chatId]);

  /** 꼬리 신규 메시지 + 스크롤이 하단이 아닐 때 → '새 메시지 있음' 칩 */
  useEffect(() => {
    const t = tailLastId ? String(tailLastId) : "";
    if (!t) return;
    const prev = prevTailLastIdRef.current;
    prevTailLastIdRef.current = t;
    if (prev === undefined) return;
    if (prev === t) return;
    if (!nearBottomRef.current) {
      setUnseenTailWhileScrolledUp(true);
    }
  }, [tailLastId]);

  useLayoutEffect(() => {
    if (loadingOlder) {
      messageGroupsSnapshotWhenOlderStartedRef.current = messageGroups.length;
    }
    if (prevLoadingOlderRef.current && !loadingOlder) {
      const added = messageGroups.length - messageGroupsSnapshotWhenOlderStartedRef.current;
      if (added > 0) {
        setVirtuosoFirstItemIndex((f) => f - added);
      }
    }
    prevLoadingOlderRef.current = loadingOlder;
  }, [loadingOlder, messageGroups.length]);

  useEffect(() => {
    messageRowElsRef.current = {};
    setActiveHighlightId(null);
    deepLinkHighlightSessionRef.current = { key: null, handled: false };
  }, [chatId]);

  useEffect(
    () => () => {
      if (imageAutoscrollRafRef.current != null) {
        cancelAnimationFrame(imageAutoscrollRafRef.current);
        imageAutoscrollRafRef.current = null;
      }
    },
    []
  );

  /** 알림 딥링크 `?messageId=` — 현재 로드된 꼬리 메시지에 있을 때만 스크롤·하이라이트 */
  useLayoutEffect(() => {
    const sessionKey = highlightMessageId && chatId ? `${chatId}:${highlightMessageId}` : null;

    if (!sessionKey || !highlightMessageId) {
      setActiveHighlightId(null);
      deepLinkHighlightSessionRef.current = { key: null, handled: false };
      return;
    }

    const sess = deepLinkHighlightSessionRef.current;
    if (sess.key !== sessionKey) {
      deepLinkHighlightSessionRef.current = { key: sessionKey, handled: false };
    } else if (deepLinkHighlightSessionRef.current.handled) {
      return;
    }

    const id = highlightMessageId;
    if (!messages.some((m) => String(m?.id ?? "") === id)) return;

    let cancelled = false;
    let frames = 0;
    const maxFrames = 12;

    const tick = () => {
      if (cancelled) return;
      if (deepLinkHighlightSessionRef.current.key !== sessionKey) return;
      if (deepLinkHighlightSessionRef.current.handled) return;

      const el = messageRowElsRef.current[id];
      if (el) {
        deepLinkHighlightSessionRef.current = {
          key: sessionKey,
          handled: true,
        };
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setActiveHighlightId(id);
        return;
      }
      frames += 1;
      if (frames >= maxFrames) return;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [highlightMessageId, messages, chatId]);

  const highlightTargetPresence = useMemo(() => {
    if (!highlightMessageId) return "none" as const;
    if (msgs.length === 0) return "loading" as const;
    return msgs.some((m) => String(m?.id ?? "") === highlightMessageId)
      ? ("present" as const)
      : ("absent" as const);
  }, [highlightMessageId, msgs]);

  /** 꼬리에 없는 messageId — 1차: 잠시 후 쿼리만 정리 (방은 그대로) */
  useEffect(() => {
    const idParam = highlightMessageId;
    if (!idParam || !chatId) return undefined;
    if (highlightTargetPresence !== "absent") return undefined;

    const t = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (next.get("messageId") === idParam) next.delete("messageId");
          return next;
        },
        { replace: true }
      );
    }, 4000);
    return () => window.clearTimeout(t);
  }, [highlightMessageId, highlightTargetPresence, chatId, setSearchParams]);

  /** 스크롤·하이라이트 적용 후 2.5초 뒤 URL·강조 해제 */
  useEffect(() => {
    const idParam = highlightMessageId;
    if (!idParam || activeHighlightId !== idParam) return undefined;

    const t = window.setTimeout(() => {
      setActiveHighlightId(null);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("messageId");
          return next;
        },
        { replace: true }
      );
    }, 2500);

    return () => window.clearTimeout(t);
  }, [activeHighlightId, highlightMessageId, setSearchParams]);

  /** Firestore 경로와 대조용 (검증 단계): 실제 구독은 항상 `chats/{chatId}/messages` */
  useEffect(() => {
    if (!chatId) return;
    const distinctAuthorUids = [...new Set(messages.map((m) => messageAuthorUid(m)).filter(Boolean))];
    const logKey = `${chatId}|${messages.length}|${[...distinctAuthorUids].sort().join(",")}`;
    if (finalPathLogKeyRef.current === logKey) return;
    finalPathLogKeyRef.current = logKey;
    console.log("🔥 FINAL CHAT PATH", {
      chatId,
      channel: "chats",
      firestoreDocumentPath: `chats/${chatId}`,
      firestoreMessagesCollectionPath: `chats/${chatId}/messages`,
      messageCount: messages.length,
      distinctAuthorIds: distinctAuthorUids,
      distinctAuthorCount: distinctAuthorUids.length,
    });
  }, [chatId, messages]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const myUid = user?.uid ?? null;
    const sampleAuthors = msgs.slice(0, 5).map((m) => ({
      id: m?.id ?? null,
      senderId: m?.senderId,
      uid: m?.uid,
      userId: m?.userId,
      authorId: m?.authorId,
      fromUserId: m?.fromUserId,
      createdBy: m?.createdBy,
      extracted: messageAuthorUid(m),
      isMine: isMessageMine(m, myUid),
    }));
    const extractedAll = messages.map((m) => messageAuthorUid(m));
    const distinctAuthorUids = [...new Set(extractedAll.filter(Boolean))];
    const messagesWithNoAuthor = extractedAll.filter((e) => !e).length;
    let verdict: string;
    if (messagesWithNoAuthor > 0) {
      verdict = "CASE3_some_empty_author_fields";
    } else if (distinctAuthorUids.length === 0) {
      verdict = "CASE3_no_extractable_author";
    } else if (distinctAuthorUids.length === 1 && myUid && distinctAuthorUids[0] === myUid) {
      verdict = "CASE1_likely_all_messages_saved_as_me";
    } else if (distinctAuthorUids.length >= 2) {
      verdict = "CASE2_or_ok_mixed_authors_check_ui_if_still_all_right";
    } else {
      verdict = "unknown";
    }
    console.log("[chat] author probe", {
      me: myUid,
      chatId,
      count: messages.length,
      sampleAuthors,
      distinctAuthorUids,
      distinctCount: distinctAuthorUids.length,
      messagesWithNoAuthor,
      verdict,
    });
  }, [chatId, messages, user?.uid]);

  useEffect(() => {
    setOtherUserId(null);
  }, [chatId]);

  useEffect(() => {
    tradeMergeRetryAfterSingleAuthorRef.current = false;
  }, [chatId]);

  /**
   * 진입 직후 서버에서 중복 `chats` 병합·정규 ID 승격 — URL이 레거시·비정규여도 문서 기준으로 canonical 이동.
   * (Firestore Rules는 Functions가 아니라 여기서 맞는 chatId로 들어가야 통과한다.)
   */
  useEffect(() => {
    if (!chatId || !user?.uid) return;

    let cancelled = false;
    void (async () => {
      const out = await callEnsureCanonicalTradeChat(chatId);
      if (cancelled) return;
      if (out.ok && out.canonicalChatId !== chatId) {
        navigate(`/app/chat/${out.canonicalChatId}`, { replace: true });
        return;
      }
      if (!out.ok) notifyEnsureCanonicalTradeChatFailure(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId, user?.uid, navigate]);

  /**
   * 메시지가 2개 이상인데 작성자 uid가 한 명뿐이면 DB에 방이 갈라진 경우가 많음 → Callable 재시도 1회.
   * (상대 문서가 postId 필드 없이 저장된 경우 첫 호출에서만 놓칠 수 있음)
   */
  useEffect(() => {
    if (!chatId || !user?.uid) return;
    if (!canonicalTradeChatDocumentIdFromRoute(chatId)) return;
    if (messages.length < 2) return;
    if (tradeMergeRetryAfterSingleAuthorRef.current) return;
    const authors = new Set(messages.map((m) => messageAuthorUid(m)).filter(Boolean));
    if (authors.size !== 1) return;
    tradeMergeRetryAfterSingleAuthorRef.current = true;

    let cancelled = false;
    void (async () => {
      const out = await callEnsureCanonicalTradeChat(chatId);
      if (cancelled) return;
      if (out.ok && out.canonicalChatId !== chatId) {
        navigate(`/app/chat/${out.canonicalChatId}`, { replace: true });
        return;
      }
      if (!out.ok) notifyEnsureCanonicalTradeChatFailure(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId, user?.uid, messages, navigate]);

  /** 동일 거래 스레드의 레거시·중복 문서 ID → 목록/생성 로직과 같은 우선 ID로 통일 */
  useEffect(() => {
    if (!chatId || !user?.uid) return;
    let cancelled = false;
    void (async () => {
      try {
        const preferred = await resolvePreferredTradeChatDocumentId(chatId, user.uid);
        if (cancelled || !preferred) return;
        navigate(`/app/chat/${preferred}`, { replace: true });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId, user?.uid, navigate]);

  // 방 입장 시 내 unreadCount 0 (리스트 배지·토스트 정합)
  useEffect(() => {
    if (!chatId || !user?.uid) return;
    void markAsRead(chatId, user.uid);
  }, [chatId, user?.uid]);

  // 상대의 채팅방 읽음 시각(readBy[otherUserId]) 실시간 — 내 메시지 '읽음' 커서 fallback
  useEffect(() => {
    if (!chatId || !otherUserId) {
      setPeerReadCursor(null);
      return;
    }
    const ref = doc(db, "chats", chatId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setPeerReadCursor(null);
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        const rb = data.readBy as Record<string, unknown> | undefined;
        const t = rb?.[otherUserId];
        if (t != null && typeof t === "object" && "toMillis" in (t as object)) {
          setPeerReadCursor(t);
        } else {
          setPeerReadCursor(null);
        }
      },
      () => setPeerReadCursor(null)
    );
    return () => unsub();
  }, [chatId, otherUserId]);

  useEffect(() => {
    if (!chatId || !user) return;

    const loadChatInfo = async () => {
      try {
        let chatDoc = await getDoc(doc(db, "chats", chatId));
        if (!chatDoc.exists()) {
          const roomSnap = await getDoc(doc(db, "chatRooms", chatId));
          if (roomSnap.exists()) {
            if (import.meta.env.DEV) {
              console.warn("[ChatRoom] chats 문서 없음 → chatRooms 경로로 이동", { chatId });
            }
            navigate(`/chat/${chatId}`, { replace: true });
            return;
          }
          /** 정규 chatId URL인데 문서가 레거시에만 있으면 서버 승격 후 canonical로 이동 또는 재조회 */
          if (canonicalTradeChatDocumentIdFromRoute(chatId)) {
            const canon = await callEnsureCanonicalTradeChat(chatId);
            if (canon.ok && canon.canonicalChatId !== chatId) {
              navigate(`/app/chat/${canon.canonicalChatId}`, { replace: true });
              return;
            }
            if (!canon.ok) notifyEnsureCanonicalTradeChatFailure(canon);
            chatDoc = await getDoc(doc(db, "chats", chatId));
          }
          if (!chatDoc.exists()) {
            return;
          }
        }
        if (chatDoc.exists()) {
          const pre = chatDoc.data() as Record<string, unknown>;
          const mergedInto = String(pre.mergedInto ?? "").trim();
          if (mergedInto && mergedInto !== chatId) {
            navigate(`/app/chat/${mergedInto}`, { replace: true });
            return;
          }
          await ensureTradeChatParticipants(chatId);
          const chatSnap = await getDoc(doc(db, "chats", chatId));
          const chatData = ((chatSnap.exists() ? chatSnap : chatDoc).data() ?? {}) as any;
          const postImage =
            typeof chatData.postImage === "string" && chatData.postImage ? chatData.postImage : "";
          const postTitle =
            typeof chatData.postTitle === "string" && chatData.postTitle ? chatData.postTitle : "";

          let sellerIdChat = String(chatData.sellerId ?? "").trim();
          let buyerIdChat = String(chatData.buyerId ?? "").trim();
          const participantsInfo = chatData.participantsInfo as
            | Record<string, { name?: string; avatar?: string }>
            | undefined;

          const uidSetForPair = participantUidSetFromChatDoc(chatData as Record<string, unknown>);
          const pidMeta = String(chatData.postId ?? "").trim();
          if (
            (!sellerIdChat || !buyerIdChat || sellerIdChat === buyerIdChat) &&
            pidMeta &&
            uidSetForPair.size === 2
          ) {
            try {
              const lo = await resolveListingOwnerUid(pidMeta);
              if (lo && uidSetForPair.has(lo)) {
                const other = [...uidSetForPair].find((u) => u !== lo);
                if (other && other !== lo) {
                  sellerIdChat = lo;
                  buyerIdChat = other;
                }
              }
            } catch {
              /* ignore */
            }
          }

          const postIdForCanon = String(chatData.postId ?? "").trim();
          if (postIdForCanon) {
            const pairCanon = await resolveTradePairUidsForCanonical(chatData, postIdForCanon, user.uid);
            if (pairCanon) {
              try {
                const canonicalRouteId = buildChatId(postIdForCanon, pairCanon.u1, pairCanon.u2);
                if (canonicalRouteId !== chatId) {
                  navigate(`/app/chat/${canonicalRouteId}`, { replace: true });
                  return;
                }
              } catch {
                /* ignore */
              }
            }
          }

          if (import.meta.env.DEV) {
            const partsArr = Array.isArray(chatData.participants)
              ? chatData.participants.map(String)
              : [];
            const usersArr = Array.isArray(chatData.users) ? chatData.users.map(String) : [];
            console.log("[ChatRoom] trade thread debug", {
              routeChatId: chatId,
              currentUid: user.uid,
              currentUserDisplayName:
                typeof (user as { displayName?: string }).displayName === "string"
                  ? (user as { displayName?: string }).displayName
                  : null,
              postId: chatData.postId,
              sellerId: sellerIdChat,
              buyerId: buyerIdChat,
              participants: chatData.participants,
              users: chatData.users,
              hasCurrentUidInParticipants: partsArr.includes(user.uid),
              hasCurrentUidInUsers: usersArr.includes(user.uid),
              matchesSellerId: sellerIdChat === user.uid,
              matchesBuyerId: buyerIdChat === user.uid,
            });
          }

          /** 상대 UID: sellerId/buyerId만 사용. 배열 순서(find !== me) 폴백은 금지 — 꼬이면 방이 갈라짐 */
          const resolveOtherUid = (): string | null => {
            const myUid = user.uid;
            const s = sellerIdChat;
            const b = buyerIdChat;
            if (s && b && s !== b) {
              if (myUid === s) return b;
              if (myUid === b) return s;
              return null;
            }
            if (uidSetForPair.size === 2 && uidSetForPair.has(myUid)) {
              const o = [...uidSetForPair].find((u) => u !== myUid);
              return o ?? null;
            }
            return null;
          };

          /** 잘못된 문서 ID·레거시 방: 상대 UID를 알 수 없는데 글 소유자가 나면 본인 상품 채팅 오진입 → 목록으로 */
          const otherUidKick = resolveOtherUid();
          const postIdForListingKick = String(
            chatData.postId ??
              (chatData.product as { id?: string } | undefined)?.id ??
              (typeof chatData.productId === "string" ? chatData.productId : "") ??
              ""
          ).trim();
          const tradeLikeKick =
            !!postIdForListingKick ||
            !!chatData.product ||
            (typeof chatData.productId === "string" && !!chatData.productId);
          if (tradeLikeKick && postIdForListingKick && !otherUidKick) {
            try {
              const lo = await resolveListingOwnerUid(postIdForListingKick);
              if (lo && lo === user.uid) {
                toast.message(
                  "본인 상품에서는 이 채팅으로 입장할 수 없습니다. 구매자와의 대화는 채팅 목록에서 선택해 주세요."
                );
                navigate("/app/chats", { replace: true });
                return;
              }
            } catch {
              /* ignore */
            }
          }

          const resolveCounterpartName = async (): Promise<string> => {
            const otherUid = resolveOtherUid();
            if (!otherUid) return "";
            const fromInfo = participantsInfo?.[otherUid]?.name;
            if (fromInfo) return fromInfo;
            try {
              const uSnap = await getDoc(doc(db, "users", otherUid));
              if (uSnap.exists()) {
                const u = uSnap.data() as any;
                return u.displayName || u.nickname || u.name || "상대방";
              }
            } catch {
              /* ignore */
            }
            return "상대방";
          };

          const resolveSellerDisplayName = async (sellerUid: string | undefined): Promise<string> => {
            if (!sellerUid) return "";
            const fromInfo = participantsInfo?.[sellerUid]?.name;
            if (fromInfo) return fromInfo;
            try {
              const uSnap = await getDoc(doc(db, "users", sellerUid));
              if (uSnap.exists()) {
                const u = uSnap.data() as any;
                return u.displayName || u.nickname || u.name || "";
              }
            } catch {
              /* ignore */
            }
            return "";
          };

          if (chatData.product) {
            const productData = chatData.product;
            let counterpartName = await resolveCounterpartName();
            const imgFromChat =
              (typeof productData.imageUrl === "string" && productData.imageUrl) ||
              productData.images?.[0] ||
              postImage;
            const listingIdFromChat =
              typeof productData.id === "string" && productData.id ? productData.id : null;

            setProduct({
              title: productData.name || postTitle || "",
              price: pickPriceFromDoc(productData),
              category: productData.category || "",
              conditionLabel: productData.condition || "",
              summary: productData.aiOneLine || productData.description || "",
              aiOneLine: productData.aiOneLine || "",
              imageUrl: imgFromChat || undefined,
              counterpartName: counterpartName || undefined,
              listingId: listingIdFromChat,
            });

            if (productData.id) {
              const productDoc = await getDoc(doc(db, "marketProducts", productData.id));
              if (productDoc.exists()) {
                const fullProductData = productDoc.data() as any;
                const sellerId = fullProductData.sellerId || fullProductData.userId;
                setIsSeller(sellerId === user.uid);
                if ((!counterpartName || counterpartName === "상대방") && user.uid !== sellerId) {
                  const sellerName = await resolveSellerDisplayName(sellerId);
                  if (sellerName) counterpartName = sellerName;
                }
                const fromDoc = pickPriceFromDoc(fullProductData);
                const fallbackPrice =
                  fromDoc || (await fetchListingPriceFallback(productData.id));
                const img =
                  fullProductData.images?.[0] ||
                  fullProductData.imageUrl ||
                  fullProductData.thumbnailUrl ||
                  imgFromChat;
                setProduct((prev) =>
                  prev
                    ? {
                        ...prev,
                        title: prev.title || fullProductData.name || "",
                        price: fallbackPrice || prev.price,
                        category: fullProductData.category || prev.category,
                        conditionLabel: fullProductData.condition || prev.conditionLabel,
                        summary:
                          fullProductData.aiOneLine ||
                          fullProductData.description ||
                          prev.summary,
                        aiOneLine: fullProductData.aiOneLine || prev.aiOneLine,
                        imageUrl: (img || prev.imageUrl) as string | undefined,
                        counterpartName: counterpartName || prev.counterpartName,
                        listingId: listingIdFromChat || prev.listingId,
                      }
                    : prev
                );
              } else {
                const fb = await fetchListingPriceFallback(productData.id);
                if (fb > 0) {
                  setProduct((prev) => (prev ? { ...prev, price: fb || prev.price } : prev));
                }
              }
            } else if (sellerIdChat) {
              setIsSeller(sellerIdChat === user.uid);
            }
          } else if (chatData.productId) {
            const productDoc = await getDoc(doc(db, "marketProducts", chatData.productId));
            if (productDoc.exists()) {
              const productData = productDoc.data() as any;
              const sellerId = productData.sellerId || productData.userId;
              let counterpartName = await resolveCounterpartName();
              if ((!counterpartName || counterpartName === "상대방") && user.uid !== sellerId) {
                const sellerName = await resolveSellerDisplayName(sellerId);
                if (sellerName) counterpartName = sellerName;
              }
              const img =
                productData.images?.[0] ||
                productData.imageUrl ||
                productData.thumbnailUrl ||
                postImage;
              let priceVal = pickPriceFromDoc(productData);
              if (!priceVal) priceVal = await fetchListingPriceFallback(chatData.productId);
              setProduct({
                title: productData.name || postTitle || "",
                price: priceVal,
                category: productData.category || "",
                conditionLabel: productData.condition || "",
                summary: productData.aiOneLine || productData.description || "",
                aiOneLine: productData.aiOneLine || "",
                imageUrl: img || undefined,
                counterpartName: counterpartName || undefined,
                listingId: chatData.productId,
              });
              setIsSeller(sellerId === user.uid);
            }
          } else if (chatData.postId) {
            const postSnap = await getDoc(doc(db, "marketPosts", chatData.postId));
            if (postSnap.exists()) {
              const p = postSnap.data() as any;
              let counterpartName = await resolveCounterpartName();
              const sellerId = p.sellerId || p.userId;
              if ((!counterpartName || counterpartName === "상대방") && user.uid !== sellerId) {
                const sellerName = await resolveSellerDisplayName(sellerId);
                if (sellerName) counterpartName = sellerName;
              }
              setIsSeller(sellerId === user.uid);
              const img = p.images?.[0] || p.imageUrl || p.thumbnailUrl || postImage;
              setProduct({
                title: p.title || p.name || postTitle || "상품",
                price: pickPriceFromDoc(p),
                category: p.category || "",
                conditionLabel: p.condition || "",
                summary: p.description || p.aiOneLine || "",
                aiOneLine: p.aiOneLine || "",
                imageUrl: img || postImage || undefined,
                counterpartName: counterpartName || undefined,
                listingId: chatData.postId,
              });
            }
          } else if (chatData.sellerId) {
            setIsSeller(chatData.sellerId === user.uid);
            const counterpartName = await resolveCounterpartName();
            if (postTitle || postImage || counterpartName) {
              setProduct({
                title: postTitle || "채팅",
                price: 0,
                category: "",
                conditionLabel: "",
                summary: "",
                aiOneLine: "",
                imageUrl: postImage || undefined,
                counterpartName: counterpartName || undefined,
                listingId: chatData.postId || null,
              });
            }
          }

          setOtherUserId(resolveOtherUid());
        } else {
          setOtherUserId(null);
        }
      } catch (error) {
        console.error("채팅 정보 로드 오류:", error);
      }
    };

    void loadChatInfo();
  }, [chatId, user?.uid, navigate]);

  /** 채팅방 입장 시 이 방으로 온 미읽음 플랫폼 알림 읽음 처리 */
  useEffect(() => {
    if (!chatId || !user?.uid) return;
    void markNotificationsReadForChat(user.uid, chatId).catch((err) => {
      console.warn("[ChatRoom] 채팅 알림 읽음 처리 실패:", err);
    });
  }, [chatId, user?.uid]);

  /** 신규 메시지(꼬리 마지막 id 변경): 하단 근처일 때만 자동 스크롤 */
  useEffect(() => {
    if (loadingOlder) return;
    if (!nearBottomRef.current) return;
    if (messageGroups.length < 1) return;
    virtuosoRef.current?.scrollToIndex({
      index: messageGroups.length - 1,
      align: "end",
      behavior: "smooth",
    });
  }, [tailLastId, loadingOlder, messageGroups.length]);

  // 상대가 보낸 메시지 → 내가 읽음(readBy) + 방 문서 unread 초기화
  useEffect(() => {
    if (!chatId || !user?.uid || !otherUserId || messages.length === 0) return;

    const incomingUnread = messages.filter((m) => {
      if (isMessageMine(m, user.uid)) return false;
      const from = messageAuthorUid(m);
      if (!from) return false;
      return !readByUids(m).includes(user.uid);
    });
    if (incomingUnread.length === 0) return;

    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const batch = writeBatch(db);
          let ops = 0;
          for (const m of incomingUnread) {
            if (ops >= 400) break;
            const ref = doc(db, "chats", chatId, "messages", m.id);
            if (Array.isArray(m.readBy)) {
              batch.update(ref, { readBy: arrayUnion(user.uid) });
            } else if (m.readBy && typeof m.readBy === "object") {
              batch.update(ref, { [`readBy.${user.uid}`]: serverTimestamp() });
            } else {
              batch.update(ref, { readBy: arrayUnion(user.uid) });
            }
            ops++;
          }
          if (ops > 0) await batch.commit();
        } catch (e) {
          console.warn("[ChatRoom] 메시지 읽음 반영 실패:", e);
        }
        try {
          await markAsRead(chatId, user.uid);
        } catch {
          /* unreadCount 없는 방은 무시 */
        }
      })();
    }, 450);

    return () => window.clearTimeout(t);
  }, [chatId, user?.uid, otherUserId, messages]);

  const send = async () => {
    const trimmed = text.trim();
    if (import.meta.env.DEV) {
      console.log("[chat] send clicked", { chatId, text: trimmed, userId: user?.uid ?? null });
    }
    if (!trimmed) {
      toast.message("메시지를 입력한 뒤 전송해 주세요.");
      return;
    }
    if (!chatId) {
      toast.error("채팅방 정보를 찾을 수 없습니다. 목록에서 다시 들어와 주세요.");
      console.warn("[ChatRoom] send: chatId 비어 있음");
      return;
    }
    if (!user?.uid) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (sending) return;
    setSending(true);
    try {
      const roomSnap = await getDoc(doc(db, "chats", chatId));
      if (!roomSnap.exists()) {
        console.error("[ChatRoom] send failed: room not found", { chatId, uid: user.uid });
        toast.error("채팅방 정보를 찾을 수 없습니다. 채팅 목록에서 다시 진입해 주세요.");
        throw new Error("CHAT_ROOM_NOT_FOUND");
      }
      const room = roomSnap.data() as Record<string, unknown>;
      const users = Array.isArray(room.users) ? room.users.map(String) : [];
      const participants = Array.isArray(room.participants) ? room.participants.map(String) : [];
      const sellerId = typeof room.sellerId === "string" ? room.sellerId : null;
      const buyerId = typeof room.buyerId === "string" ? room.buyerId : null;
      const allowedFromArrays = [...new Set([...participants, ...users])];
      const hasCurrentUidInParticipants = participants.includes(user.uid);
      const hasCurrentUidInUsers = users.includes(user.uid);
      const matchesSellerOrBuyer = sellerId === user.uid || buyerId === user.uid;
      const isMember =
        hasCurrentUidInUsers ||
        hasCurrentUidInParticipants ||
        matchesSellerOrBuyer;
      if (!isMember) {
        console.error("[ChatRoom] send blocked: 현재 사용자가 채팅방 참여자가 아님", {
          chatId,
          currentUid: user.uid,
          sellerId,
          buyerId,
          participants,
          users,
          allowedFromArrays,
          hasCurrentUidInParticipants,
          hasCurrentUidInUsers,
          matchesSellerOrBuyer,
          hint:
            "Firestore Rules는 sellerId/buyerId 또는 users/participants 로 참가자를 판별합니다. 이 방의 seller/buyer와 로그인 계정이 일치하는지 확인하세요.",
        });
        toast.error(
          "이 채팅방 참가자로 등록되어 있지 않습니다. 상품에서 「채팅하기」로 다시 들어오거나 판매자·구매자 계정이 맞는지 확인해 주세요."
        );
        throw new Error("CHAT_MEMBER_PERMISSION_DENIED");
      }
      if (import.meta.env.DEV) {
        console.log("[ChatRoom] send member check OK", {
          chatId,
          currentUid: user.uid,
          hasCurrentUidInParticipants,
          hasCurrentUidInUsers,
          matchesSellerOrBuyer,
        });
      }
      const tm = await fetchTradeThreadMemberIdsForChat(chatId);
      const payload = cleanFirestoreData({
        type: "text",
        uid: user.uid,
        senderId: user.uid,
        text: trimmed,
        // orderBy("createdAt") 실시간 목록에 즉시 반영되도록 클라이언트 타임스탬프 사용
        createdAt: new Date(),
        readBy: [user.uid],
        ...(tm ? { threadMemberIds: tm } : {}),
      });
      if (import.meta.env.DEV) {
        console.log("[chat] before addDoc", payload);
      }
      const messageRef = await addDoc(collection(db, "chats", chatId, "messages"), payload);
      if (import.meta.env.DEV) {
        console.log("[chat] addDoc success");
      }
      try {
        const chatRef = doc(db, "chats", chatId);
        const payload: Record<string, unknown> = {
          lastMessage: {
            text: trimmed,
            senderId: user.uid,
            type: "text",
            createdAt: serverTimestamp(),
          },
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessageSenderId: user.uid,
          lastMessageRead: false,
          [`unreadCount.${user.uid}`]: 0,
        };
        if (otherUserId) {
          payload[`unreadCount.${otherUserId}`] = increment(1);
        }
        await updateDoc(chatRef, payload);
        await mirrorTradeChatRoomLastMessage(chatId, {
          text: trimmed,
          senderId: user.uid,
          type: "text",
        });
      } catch (e) {
        console.warn("[ChatRoom] 방 메타(lastMessage/unread) 갱신 실패:", e);
      }
      void notifyTradeChatRecipient({
        recipientUserId: otherUserId,
        chatId,
        senderId: user.uid,
        previewText: trimmed,
        messageDocId: messageRef.id,
      });
      nearBottomRef.current = true;
      setText("");
    } catch (e) {
      const detail = toErrorDetail(e);
      console.error("[chat] addDoc error", {
        code: detail.code,
        message: detail.message,
        chatId,
        uid: user?.uid ?? null,
      });
      toastTradeChatWriteDenied(detail.code, "text");
      throw e;
    } finally {
      setSending(false);
    }
  };

  const sendOffer = async () => {
    if (!chatId || !user?.uid) return;
    const n = Number(String(offerDraft).replace(/[^0-9]/g, ""));
    if (!Number.isFinite(n) || n < 1) {
      alert("제안할 가격을 숫자로 입력해 주세요.");
      return;
    }
    const preview = `💰 ${n.toLocaleString()}원 제안`;
    let offerMsgRef;
    try {
      const tm = await fetchTradeThreadMemberIdsForChat(chatId);
      offerMsgRef = await addDoc(collection(db, "chats", chatId, "messages"), {
        type: "offer",
        uid: user.uid,
        senderId: user.uid,
        text: preview,
        offerPrice: n,
        offerStatus: "pending",
        createdAt: new Date(),
        readBy: [user.uid],
        ...(tm ? { threadMemberIds: tm } : {}),
      });
    } catch (e) {
      const detail = toErrorDetail(e);
      console.error("[chat] offer addDoc error", detail);
      toastTradeChatWriteDenied(detail.code, "offer");
      return;
    }
    try {
      const chatRef = doc(db, "chats", chatId);
      const payload: Record<string, unknown> = {
        lastMessage: {
          text: preview,
          senderId: user.uid,
          type: "offer",
          createdAt: serverTimestamp(),
        },
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        lastMessageRead: false,
        [`unreadCount.${user.uid}`]: 0,
      };
      if (otherUserId) {
        payload[`unreadCount.${otherUserId}`] = increment(1);
      }
      await updateDoc(chatRef, payload);
      await mirrorTradeChatRoomLastMessage(chatId, {
        text: preview,
        senderId: user.uid,
        type: "offer",
      });
    } catch (e) {
      console.warn("[ChatRoom] 방 메타(제안) 갱신 실패:", e);
    }
    void notifyTradeChatRecipient({
      recipientUserId: otherUserId,
      chatId,
      senderId: user.uid,
      previewText: preview,
      messageDocId: offerMsgRef!.id,
    });
    setOfferDraft("");
  };

  const respondToOffer = async (m: any, next: "accepted" | "rejected") => {
    if (!chatId || !user?.uid) return;
    const from = messageAuthorUid(m);
    if (!from || from === user.uid) return;
    if (m.offerStatus && m.offerStatus !== "pending") return;
    try {
      await updateDoc(doc(db, "chats", chatId, "messages", m.id), { offerStatus: next });
    } catch (e) {
      console.error("[ChatRoom] 제안 응답 실패:", e);
      alert("제안 처리 중 오류가 발생했습니다.");
      return;
    }
    if (next === "accepted" && isSeller && product?.listingId) {
      const buyerUid = from;
      if (buyerUid && buyerUid !== user.uid) {
        const ok = await tryReserveListingForBuyer(product.listingId, buyerUid);
        if (!ok) {
          alert("제안은 수락되었으나 상품 예약 반영에 실패했습니다. 상품 상세에서 상태를 확인해 주세요.");
        }
      }
    }
  };

  const softDeleteMessage = async (m: any) => {
    if (!chatId || !user?.uid) return;
    if (!isMessageMine(m, user.uid)) {
      toast.error("내 메시지만 삭제할 수 있습니다.");
      return;
    }
    if (isMessageDeleted(m)) return;
    const ok = window.confirm("이 메시지를 삭제하시겠습니까?");
    if (!ok) return;
    const messageId = String(m?.id ?? "");
    if (!messageId) return;
    try {
      await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
        deleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user.uid,
        text: "",
      });
    } catch (e) {
      console.error("[ChatRoom] 메시지 soft delete 실패:", e);
      toast.error("메시지 삭제에 실패했습니다.");
    }
  };

  const handleAiNegotiate = async () => {
    if (!messages.length || !product || !user || !chatId) {
      alert("대화가 없거나 상품 정보가 없습니다.");
      return;
    }

    try {
      setAiLoading(true);

      const isMineMsg = (m: any) => isMessageMine(m, user.uid);

      const history = messages.slice(-15).map((m) => ({
        role:
          isMineMsg(m)
            ? isSeller
              ? "seller"
              : "buyer"
            : isSeller
              ? "buyer"
              : "seller",
        message:
          m.type === "image"
            ? "[사진]"
            : m.type === "offer" && m.offerPrice != null
              ? `💰 ${Number(m.offerPrice).toLocaleString()}원 제안`
              : m.text || "",
        time: m.createdAt
          ? m.createdAt.toDate
            ? m.createdAt.toDate().toISOString()
            : String(m.createdAt)
          : "",
      }));

      const functionsOrigin =
        import.meta.env.VITE_FUNCTIONS_ORIGIN ||
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const res = await fetch(`${functionsOrigin}/negotiateHelper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history,
          userRole: isSeller ? "seller" : "buyer",
          product: {
            title: product.title,
            price: product.price,
            category: product.category,
            conditionLabel: product.conditionLabel,
            summary: product.summary,
            aiOneLine: product.aiOneLine,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("AI 흥정 도우미 서버 응답 오류");
      }

      const data = await res.json();
      setAiReply(data.reply || "");
      setAiPrice(data.suggestedPrice || null);
      setAiRisk(data.risk || "low");
      setAiRiskReason(data.riskReason || "");
      setAiNote(data.note || "");
    } catch (err: any) {
      console.error("🧠 AI 흥정 도우미 오류:", err);
      alert("AI 흥정 도우미를 불러오는 중 문제가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  const hasAiPanel = !!(aiReply || aiNote || aiPrice !== null || aiRisk);

  const tradeSubline =
    product &&
    (() => {
      const who = product.counterpartName?.trim();
      const priceOk = product.price != null && Number(product.price) > 0;
      const priceTxt = priceOk ? `${Number(product.price).toLocaleString()}원` : "";
      if (who && priceTxt) return `${who} · ${priceTxt}`;
      if (who) return `${who} · 가격 문의`;
      if (priceTxt) return priceTxt;
      return "거래 정보 확인 중";
    })();

  const openProductDetail = () => {
    if (product?.listingId) navigate(`/app/market/${product.listingId}`);
  };

  if (import.meta.env.DEV) {
    console.log("TYPE CHECK", {
      listingStatus: typeof product?.conditionLabel,
      locationLabel: typeof tradeSubline,
      timeAgo: typeof messages[messages.length - 1]?.createdAt,
      productStatus: typeof product?.category,
    });
  }

  return (
    <div className="chat-page-layout flex min-h-0 w-full flex-1 flex-col bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col 2xl:max-w-3xl">
        {product?.title ? (
        <div
          role={product.listingId ? "button" : undefined}
          tabIndex={product.listingId ? 0 : undefined}
          onClick={product.listingId ? () => openProductDetail() : undefined}
          onKeyDown={
            product.listingId
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openProductDetail();
                  }
                }
              : undefined
          }
          className={`mx-4 mt-0 flex shrink-0 items-center gap-3 rounded-xl border border-gray-200/80 bg-gray-50 p-3 transition duration-150 dark:border-gray-600 dark:bg-gray-800/90 ${
            product.listingId
              ? "cursor-pointer shadow-sm hover:scale-[1.01] hover:bg-gray-100/80 hover:shadow-md hover:ring-1 hover:ring-gray-200/70 active:scale-[0.98] dark:hover:bg-gray-800 dark:hover:ring-gray-600/60"
              : ""
          }`}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt=""
              className="pointer-events-none h-12 w-12 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="pointer-events-none flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gray-200 text-lg text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              📦
            </div>
          )}
          <div className="pointer-events-none min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {safeText(product.title)}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{safeText(tradeSubline)}</p>
          </div>
          {product.listingId ? (
            <span className="pointer-events-none shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400">
              상세보기 →
            </span>
          ) : null}
        </div>
        ) : null}

        {tradeMessagesPermissionDenied ? (
          <div className="mx-4 mb-1 shrink-0 rounded-lg border border-amber-200/70 bg-amber-50/95 px-3 py-2 text-[11px] leading-snug text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-50">
            상대 메시지가 안 보이면 <strong>서로 다른 채팅방</strong>일 수 있습니다. 같은 상품 화면에서 「채팅하기」를 다시 눌러 같은 방으로 맞춰 주세요.
            일부 메시지에 실패 표시가 있으면 규칙 거부일 수 있어요 — 배포된 Firestore 규칙을 확인해 주세요.
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col">
          {messages.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-3 text-center">
              <div className="max-w-sm text-gray-500 dark:text-gray-400">
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">💬 아직 대화가 없습니다</p>
                <p className="mt-2 text-sm leading-relaxed">
                  상품에 대해 먼저 물어보세요. 직거래 장소나 상태도 함께 확인해 보세요 👋
                </p>
              </div>
            </div>
          ) : (
            <div className="chat-messages relative flex min-h-0 flex-1 flex-col overscroll-contain">
              <Virtuoso<TradeMessageGroup>
                key={chatId}
                ref={virtuosoRef}
                data={messageGroups}
                firstItemIndex={virtuosoFirstItemIndex}
                initialTopMostItemIndex={messageGroups.length > 0 ? messageGroups.length - 1 : 0}
                computeItemKey={(_index, group) => tradeGroupStableKey(group)}
                defaultItemHeight={140}
                increaseViewportBy={{ top: 400, bottom: 800 }}
                alignToBottom
                followOutput={atBottom ? "smooth" : false}
                atBottomThreshold={80}
                atBottomStateChange={(bottom) => {
                  nearBottomRef.current = bottom;
                  setAtBottom(bottom);
                  if (bottom) {
                    setUnseenTailWhileScrolledUp(false);
                  }
                  if (bottom && chatId && user?.uid) {
                    const now = Date.now();
                    if (now - lastScrollMarkReadAtRef.current >= 2500) {
                      lastScrollMarkReadAtRef.current = now;
                      void markAsRead(chatId, user.uid);
                    }
                  }
                }}
                scrollerRef={(el) => {
                  messagesContainerRef.current = el;
                }}
                className="min-h-0 flex-1 outline-none [&::-webkit-scrollbar]:w-2"
                components={{
                  Header: () => (
                    <div className="mx-auto flex w-full max-w-[560px] flex-col px-4 py-2 sm:px-5">
                      {loadingOlder ? (
                        <div className="mb-2 w-full shrink-0 text-center text-[11px] text-gray-400 dark:text-gray-500">
                          이전 메시지 불러오는 중…
                        </div>
                      ) : null}
                      {hasMoreOlder && !loadingOlder ? (
                        <div className="mb-2 text-center">
                          <button
                            type="button"
                            className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800/80"
                            onClick={() => void loadOlderMessages()}
                          >
                            이전 메시지 더 보기
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ),
                  Footer: () => <div ref={bottomRef} className="h-2 shrink-0" aria-hidden />,
                }}
                itemContent={(gi, group) => {
                  try {
                    const first = group.items[0];
                    if (!first) return null;
                    const prevMsg = group.startIndex > 0 ? messages[group.startIndex - 1] : null;
                    const firstDate = createdAtToDate(first.createdAt);
                    const prevD = prevMsg ? createdAtToDate(prevMsg.createdAt) : null;
                    const showDateSeparator =
                      firstDate != null &&
                      (group.startIndex === 0 || !prevD || !sameCalendarDay(firstDate, prevD));
                    const groupTopMargin = gi > 0 && !showDateSeparator ? "mt-3" : "";
                    const mine = isMessageMine(first, user?.uid);
                    const lastInGroup = group.items[group.items.length - 1]!;

                    const timeTextLast = formatChatListTime(lastInGroup?.createdAt);
                    const isDeletedLast = isMessageDeleted(lastInGroup);
                    const mineLast = isMessageMine(lastInGroup, user?.uid);
                    const peerReadLast =
                      !isDeletedLast && mineLast && otherUserId
                        ? peerHasReadMyMessage(lastInGroup, otherUserId, peerReadCursor)
                        : false;
                    const isLastMyMessage =
                      mineLast && String(lastInGroup?.id ?? "") === String(lastMyMessageId ?? "");
                    const readStateLast =
                      !mineLast
                        ? null
                        : peerReadLast
                          ? "read"
                          : isLastMyMessage
                            ? "unread"
                            : null;
                    const showMetaRow =
                      (mineLast ? !!(timeTextLast || readStateLast === "unread") : !!timeTextLast);

                    return (
                      <div className="mx-auto w-full max-w-[560px] px-4 sm:px-5">
                        {showDateSeparator ? (
                          <div className="my-3 flex w-full justify-center px-2 first:mt-0">
                            <span className="rounded-full bg-gray-100/95 px-3 py-1 text-center text-[12px] font-medium text-gray-500 shadow-sm dark:bg-gray-800/90 dark:text-gray-400">
                              {formatChatListDateLabel(first.createdAt)}
                            </span>
                          </div>
                        ) : null}
                        <div
                          className={`${groupTopMargin} mb-2 flex w-full min-w-0 px-1 ${
                            mine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`flex min-w-0 max-w-[min(100%,24rem)] flex-col ${
                              mine ? "items-end" : "items-start"
                            }`}
                          >
                            <div
                              className={`flex min-w-0 max-w-full flex-col gap-1 ${
                                mine ? "items-end" : "items-start"
                              }`}
                            >
                            {segmentTradeGroupItems(group.items).map((seg, sidx) => {
                              try {
                                if (seg.kind === "textRun") {
                                  const first = seg.messages[0]!;
                                  const itemMine = isMessageMine(first, user?.uid);
                                  const n = seg.messages.length;
                                  const segKey = `tr-${String(first?.id ?? `${group.startIndex}-${sidx}`)}`;
                                  const textRunShell = itemMine
                                    ? "min-w-0 w-fit max-w-full overflow-hidden rounded-[18px] text-[15px] leading-[1.4] ring-1 bg-[#dbeafe] text-[#1e3a8a] ring-blue-100/90 dark:bg-blue-950/45 dark:text-blue-100 dark:ring-blue-800/45"
                                    : "min-w-0 w-fit max-w-full overflow-hidden rounded-[18px] text-[15px] leading-[1.4] ring-1 bg-[#f3f4f6] text-gray-900 ring-gray-200/90 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600/60";
                                  const textRunDivide = itemMine
                                    ? "divide-y divide-black/5 dark:divide-blue-100/15"
                                    : "divide-y divide-black/5 dark:divide-gray-400/25";
                                  return (
                                    <div
                                      key={segKey}
                                      className={`flex flex-col ${textRunShell} ${n > 1 ? textRunDivide : ""}`}
                                    >
                                      {seg.messages.map((m, li) => {
                                        const lineMine = isMessageMine(m, user?.uid);
                                        const txt = toRenderableText(m.text) || "(빈 메시지)";
                                        const rowId = String(m?.id ?? "");
                                        const pad =
                                          n === 1
                                            ? "px-[14px] py-3"
                                            : li === 0
                                              ? "px-[14px] pt-3 pb-0.5"
                                              : li === n - 1
                                                ? "px-[14px] pt-0.5 pb-3"
                                                : "px-[14px] py-0.5";
                                        return (
                                          <div
                                            key={String(m?.id ?? li)}
                                            ref={(el) => assignMessageRowEl(messageRowElsRef, rowId, el)}
                                            data-message-id={rowId || undefined}
                                            className={cn(
                                              `whitespace-pre-wrap break-words ${pad}`,
                                              rowId && activeHighlightId === rowId
                                                ? "bg-blue-50/90 ring-2 ring-blue-400/90 transition-colors duration-500 dark:bg-blue-950/45 dark:ring-blue-400/80"
                                                : ""
                                            )}
                                            title={lineMine ? "우클릭하면 삭제할 수 있어요" : undefined}
                                            onContextMenu={(e) => {
                                              if (!lineMine) return;
                                              e.preventDefault();
                                              void softDeleteMessage(m);
                                            }}
                                          >
                                            {txt}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                }

                                const m = seg.message;
                                const itemMine = isMessageMine(m, user?.uid);
                                const renderText = toRenderableText(m.text);
                                const msgType = (m as { type?: string }).type;
                                const isOffer = msgType === "offer";
                                const isImage = msgType === "image";
                                const isFile = msgType === "file";
                                const imageUrl =
                                  typeof (m as { imageUrl?: unknown }).imageUrl === "string"
                                    ? (m as { imageUrl: string }).imageUrl
                                    : "";
                                const fileUrl =
                                  typeof (m as { fileUrl?: unknown }).fileUrl === "string"
                                    ? (m as { fileUrl: string }).fileUrl
                                    : "";
                                const fileName =
                                  typeof (m as { fileName?: unknown }).fileName === "string"
                                    ? (m as { fileName: string }).fileName
                                    : "파일";
                                const fileSizeRaw = (m as { fileSize?: unknown }).fileSize;
                                const isDeleted = isMessageDeleted(m);
                                const radius = "rounded-[18px] px-[14px] py-3 leading-[1.4]";
                                const bubbleTone = isOffer
                                  ? OFFER_CARD
                                  : itemMine
                                    ? BUBBLE_MINE
                                    : BUBBLE_OTHER;
                                const rowKey = String(m?.id ?? `${group.startIndex}-s${sidx}`);
                                const rowDomId = String(m?.id ?? "");
                                const rowHighlight =
                                  rowDomId && activeHighlightId === rowDomId
                                    ? "ring-2 ring-blue-400/90 shadow-sm transition-colors duration-500 dark:ring-blue-400/80"
                                    : "";
                                return (
                                  <Fragment key={rowKey}>
                                    {isDeleted ? (
                                      <div
                                        ref={(el) => assignMessageRowEl(messageRowElsRef, rowDomId, el)}
                                        data-message-id={rowDomId || undefined}
                                        className={cn(
                                          `min-w-0 w-fit max-w-full text-xs italic text-gray-500 ${radius} border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/90`,
                                          rowHighlight
                                        )}
                                      >
                                        <span className="select-none">삭제된 메시지입니다</span>
                                      </div>
                                    ) : isImage && imageUrl ? (
                                      <div
                                        ref={(el) => assignMessageRowEl(messageRowElsRef, rowDomId, el)}
                                        data-message-id={rowDomId || undefined}
                                        className={cn(
                                          `min-w-0 w-fit max-w-full overflow-hidden ${radius} ${bubbleTone}`,
                                          rowHighlight
                                        )}
                                        title={itemMine ? "우클릭하면 삭제할 수 있어요" : undefined}
                                        onContextMenu={(e) => {
                                          if (!itemMine) return;
                                          e.preventDefault();
                                          void softDeleteMessage(m);
                                        }}
                                      >
                                        <button
                                          type="button"
                                          className="block w-full"
                                          onClick={() => setImageLightboxSrc(imageUrl)}
                                        >
                                          <img
                                            src={imageUrl}
                                            alt=""
                                            className="max-h-64 max-w-[220px] object-cover"
                                            onLoad={() => {
                                              if (!nearBottomRef.current) return;
                                              if (imageAutoscrollRafRef.current != null) {
                                                cancelAnimationFrame(imageAutoscrollRafRef.current);
                                              }
                                              imageAutoscrollRafRef.current = requestAnimationFrame(() => {
                                                virtuosoRef.current?.autoscrollToBottom();
                                                imageAutoscrollRafRef.current = null;
                                              });
                                            }}
                                          />
                                        </button>
                                      </div>
                                    ) : isFile && fileUrl ? (
                                      <div
                                        ref={(el) => assignMessageRowEl(messageRowElsRef, rowDomId, el)}
                                        data-message-id={rowDomId || undefined}
                                        className={cn(
                                          `min-w-0 w-fit max-w-full overflow-hidden border border-gray-200/90 bg-gray-50/95 dark:border-gray-600/70 dark:bg-gray-800/80 ${radius}`,
                                          rowHighlight
                                        )}
                                        title={itemMine ? "우클릭하면 삭제할 수 있어요" : undefined}
                                        onContextMenu={(e) => {
                                          if (!itemMine) return;
                                          e.preventDefault();
                                          void softDeleteMessage(m);
                                        }}
                                      >
                                        <a
                                          href={fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title={fileName}
                                          className="block px-[14px] py-3 text-[15px] font-medium text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
                                        >
                                          📎 {truncateFileDisplayName(fileName)}
                                        </a>
                                        <div className="border-t border-gray-200/80 px-[14px] pb-3 pt-0 text-[11px] text-gray-500 dark:border-gray-600/60 dark:text-gray-400">
                                          {formatChatFileSize(fileSizeRaw)}
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        ref={(el) => assignMessageRowEl(messageRowElsRef, rowDomId, el)}
                                        data-message-id={rowDomId || undefined}
                                        className={cn(
                                          isOffer
                                            ? `min-w-0 w-fit max-w-full text-[15px] leading-[1.4] whitespace-pre-wrap break-words ${OFFER_CARD}${sidx > 0 ? " mt-1.5" : ""}`
                                            : `min-w-0 w-fit max-w-full text-[15px] leading-[1.4] whitespace-pre-wrap break-words ${bubbleTone} ${radius}`,
                                          rowHighlight
                                        )}
                                        title={itemMine ? "우클릭하면 삭제할 수 있어요" : undefined}
                                        onContextMenu={(e) => {
                                          if (!itemMine) return;
                                          e.preventDefault();
                                          void softDeleteMessage(m);
                                        }}
                                      >
                                        {isOffer ? (
                                          <div className="flex flex-col gap-0.5">
                                            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80 dark:text-amber-200/90">
                                              가격 제안
                                            </div>
                                            <div className="text-base font-bold tabular-nums text-amber-950 dark:text-amber-50">
                                              {renderText || "제안"}
                                            </div>
                                          </div>
                                        ) : (
                                          renderText || "(빈 메시지)"
                                        )}
                                      </div>
                                    )}
                                  </Fragment>
                                );
                              } catch (err) {
                                if (import.meta.env.DEV) {
                                  console.error("[chat] segment render error", {
                                    groupIndex: gi,
                                    segIndex: sidx,
                                    err,
                                  });
                                }
                                return (
                                  <div
                                    key={`err-${gi}-${sidx}`}
                                    className="mb-1 px-3 text-xs text-red-500"
                                  >
                                    메시지 렌더 오류
                                  </div>
                                );
                              }
                            })}
                            </div>
                            {showMetaRow ? (
                              <div
                                className={`mt-1.5 flex max-w-full flex-wrap items-baseline gap-x-1 tabular-nums text-[11px] leading-snug ${
                                  mineLast ? "justify-end pr-1" : "justify-start pl-1"
                                }`}
                              >
                                {mineLast && readStateLast === "unread" ? (
                                  <span className="font-medium text-blue-600 dark:text-blue-400">
                                    안읽음
                                  </span>
                                ) : null}
                                {timeTextLast ? (
                                  <span
                                    className={
                                      mineLast
                                        ? isDeletedLast
                                          ? "opacity-70 text-gray-400 dark:text-gray-500"
                                          : readStateLast === "read"
                                            ? "opacity-70 text-slate-500 dark:text-slate-400"
                                            : "opacity-70 text-gray-400 dark:text-gray-500"
                                        : "opacity-70 text-gray-400/90 dark:text-gray-500"
                                    }
                                  >
                                    {safeText(timeTextLast)}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  } catch (err) {
                    if (import.meta.env.DEV) {
                      console.error("[chat] group render error", { groupIndex: gi, err });
                    }
                    return (
                      <div key={`err-g-${gi}`} className="mb-1 px-3 text-xs text-red-500">
                        메시지 묶음 렌더 오류
                      </div>
                    );
                  }
                }}
              />
              {!atBottom && unseenTailWhileScrolledUp ? (
                <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-20 flex justify-center px-4">
                  <button
                    type="button"
                    className="pointer-events-auto rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-md dark:border-blue-800 dark:bg-gray-800 dark:text-blue-200"
                    onClick={() => scrollChatToBottom()}
                  >
                    새 메시지 있음 ↓
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {hasAiPanel ? (
        <div className="max-h-36 shrink-0 overflow-y-auto border-t border-purple-100 bg-purple-50/95 px-3 py-2 text-xs text-purple-900 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-100">
          {aiReply && (
            <div className="mb-2">
              <div className="mb-0.5 font-semibold">제안 답변</div>
              <div className="whitespace-pre-line">{safeText(aiReply)}</div>
              <button
                type="button"
                className="mt-1 text-[11px] font-medium text-purple-700 underline dark:text-purple-300"
                onClick={() => setText(aiReply)}
              >
                입력창에 넣기
              </button>
            </div>
          )}
          {aiPrice !== null && aiPrice > 0 && (
            <div className="mb-1 font-medium">
              추천 가격 약 {aiPrice.toLocaleString()}원
            </div>
          )}
          {aiRisk && (
            <div
              className={
                aiRisk === "high"
                  ? "text-red-600 dark:text-red-400"
                  : aiRisk === "medium"
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-green-700 dark:text-green-400"
              }
            >
              위험도 {aiRisk.toUpperCase()}
              {aiRiskReason ? ` — ${safeText(aiRiskReason)}` : ""}
            </div>
          )}
          {aiNote ? <div className="mt-1 opacity-80">참고: {safeText(aiNote)}</div> : null}
        </div>
        ) : null}

        <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] shadow-[0_-4px_16px_rgba(0,0,0,0.05)] dark:border-gray-700 dark:bg-gray-800">
        {product ? (
          <div className="mb-2 flex items-center gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-1.5 text-sm text-gray-900 outline-none ring-2 ring-transparent placeholder:text-amber-800/40 focus:border-amber-300 focus:ring-amber-200/60 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-50 dark:placeholder:text-amber-200/35 dark:focus:border-amber-600 dark:focus:ring-amber-700/40"
              inputMode="numeric"
              value={offerDraft}
              onChange={(e) => setOfferDraft(e.target.value)}
              placeholder="가격 제안 (원)"
            />
            <button
              type="button"
              onClick={() => void sendOffer()}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 active:scale-[0.97]"
            >
              제안 보내기
            </button>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <ChatPanelAttachButton
            channel="chats"
            roomId={chatId || null}
            uid={user?.uid ?? null}
            disabled={sending}
            tradeOtherUserId={otherUserId}
          />
          <button
            type="button"
            onClick={() => void handleAiNegotiate()}
            disabled={aiLoading || !messages.length || !product}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300 dark:disabled:hover:bg-transparent"
            title="AI 흥정 도우미"
          >
            {aiLoading ? (
              "…"
            ) : (
              <>
                <span aria-hidden>🤖</span>
                <span>AI</span>
              </>
            )}
          </button>
          <textarea
            ref={messageInputRef}
            rows={1}
            className="chat-input-textarea min-h-[40px] max-h-[120px] min-w-0 flex-1 resize-none rounded-2xl border border-transparent bg-gray-100 px-4 py-2.5 text-sm leading-snug text-gray-900 outline-none ring-2 ring-transparent transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-transparent dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-500 dark:focus:bg-gray-950 dark:focus:ring-blue-500/35"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="메시지 보내기…"
            onKeyDown={(e) => {
              // 한글 IME 조합 중 Enter는 전송으로 처리하지 않는다.
              const native = e.nativeEvent as KeyboardEvent;
              if (native.isComposing || native.keyCode === 229) {
                return;
              }
              // Enter만 전송, Shift+Enter는 줄바꿈(기본 동작)
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (sending || !text.trim()) return;
                void send();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !text.trim()}
            title={!text.trim() ? "메시지를 입력한 뒤 전송해 주세요" : undefined}
            className="shrink-0 rounded-full bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "전송 중…" : "전송"}
          </button>
        </div>
        </footer>
      </div>
      <ChatImageLightbox
        open={!!imageLightboxSrc}
        src={imageLightboxSrc || ""}
        onClose={() => setImageLightboxSrc(null)}
      />
    </div>
  );
}
