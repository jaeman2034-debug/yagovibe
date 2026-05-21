// 🔥 채팅 목록 페이지 (당근마켓 스타일 - chatRooms 컬렉션 사용)
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
  setDoc,
  serverTimestamp,
  collectionGroup,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";
import {
  getOrCreateChat,
  normalizeTradeChatDocumentIdForRoute,
  resolveListingOwnerUid,
} from "@/features/chat/services/chatService";
import { PushNotificationGuide } from "./components/PushNotificationGuide";

interface ChatRoomItem {
  id: string;
  /** room: chatRooms 구독 / direct: chats 컬렉션 1:1 */
  listSource?: "room" | "direct";
  // 🔥 통합 모델: type 필드로 모집/거래 구분
  type?: "recruit_group" | "trade";
  // 🔥 통합 모델: members 배열 (모집 단체방과 공통)
  members?: string[];
  // 🔥 통합 모델: roles 객체 (모집 단체방과 공통)
  roles?: { [uid: string]: "host" | "member" | "seller" | "buyer" };
  // 🔥 하위 호환: 기존 필드 유지
  productId: string;
  buyerId?: string;
  sellerId?: string;
  participants?: string[];
  // 🔥 모집 채팅방용 필드
  postId?: string;
  authorId?: string;
  lastMessage?: string;
  lastMessageAt?: any;
  unreadCount?: { [uid: string]: number };
  productSnapshot?: {
    productId?: string;
    title?: string;
    price?: number;
    imageUrl?: string;
    status?: "ACTIVE" | "SOLD" | "DELETED";
  };
}

interface ChatSetting {
  pinned: boolean;
  hidden: boolean;
  updatedAt?: any;
}

function normalizeDirectChat(id: string, d: Record<string, unknown>): ChatRoomItem {
  const postTitle = typeof d.postTitle === "string" ? d.postTitle : "";
  const product = (d.product as { name?: string; imageUrl?: string; id?: string } | undefined) || {};
  const title = postTitle || product.name || "채팅";
  const imageUrl =
    (typeof d.postImage === "string" && d.postImage) || product.imageUrl || "";
  const participants = (d.participants as string[] | undefined) || (d.users as string[] | undefined) || [];
  return {
    id,
    listSource: "direct",
    type: "trade",
    productId: (typeof d.postId === "string" && d.postId) || product.id || "",
    buyerId: d.buyerId as string | undefined,
    sellerId: d.sellerId as string | undefined,
    participants,
    postId: typeof d.postId === "string" ? d.postId : undefined,
    lastMessage: d.lastMessage as any,
    lastMessageAt: d.lastMessageAt,
    unreadCount: (d.unreadCount as ChatRoomItem["unreadCount"]) || {},
    productSnapshot: {
      title,
      imageUrl,
      price: typeof d.price === "number" ? d.price : undefined,
    },
  };
}

export default function ChatListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myUid = user?.uid;

  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [settings, setSettings] = useState<Record<string, ChatSetting>>({});
  const [loading, setLoading] = useState(true);
  const [directRooms, setDirectRooms] = useState<ChatRoomItem[]>([]);
  const [directLoading, setDirectLoading] = useState(true);
  const directFromParticipantsRef = useRef(new Map<string, ChatRoomItem>());
  const directFromUsersRef = useRef(new Map<string, ChatRoomItem>());
  const [showHidden, setShowHidden] = useState(false);
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set());

  // 🔥 차단 목록 로드 (내가 차단한 사용자)
  useEffect(() => {
    let cancelled = false;
    const loadBlocked = async () => {
      if (!myUid) {
        setBlockedSet(new Set());
        return;
      }
      try {
        const snap = await getDocs(collection(db, "users", myUid, "blockedUsers"));
        if (cancelled) return;
        setBlockedSet(new Set(snap.docs.map((d) => d.id)));
      } catch {
        // 조용히 무시 (네트워크/권한 이슈는 목록에 영향만)
      }
    };
    loadBlocked();
    return () => {
      cancelled = true;
    };
  }, [myUid]);

  // 🔥 1️⃣ 채팅방 목록 실시간 구독 (최적화: reconnect-safe, limit 적용)
  useEffect(() => {
    if (!myUid) {
      setLoading(false);
      return;
    }

    // 🔥 표준화: participants만 사용 (인덱스와 일치)
    const participantsQuery = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", myUid),
      orderBy("lastMessageAt", "desc"),
      limit(50) // 🔥 limit 추가 (과부하 방지)
    );
    
    let isUnmounted = false; // 🔥 cleanup 추적

    const unsubscribe = onSnapshot(
      participantsQuery,
      (snapshot) => {
        if (isUnmounted) return; // 🔥 cleanup 후 호출 방지
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as ChatRoomItem[];
        setRooms(list);
        setLoading(false);
      },
      (error: any) => {
        // 🔥 네트워크 에러는 조용히 처리 (Firebase 자동 재연결)
        if (error.code === "unavailable" || error.code === "deadline-exceeded") {
          return;
        }
        // 🔥 권한 오류만 로그
        if (error.code === "permission-denied") {
          console.error("❌ [ChatListPage] 채팅 목록 조회 권한 없음");
        }
        setLoading(false);
      }
    );

    return () => {
      isUnmounted = true; // 🔥 cleanup 플래그 설정
      unsubscribe(); // 🔥 리스너 해제
    };
  }, [myUid]);

  // 🔥 1:1 거래 `chats` 문서 (participants / users) — `/app/chat/:id` 와 동일 컬렉션
  useEffect(() => {
    if (!myUid) {
      setDirectRooms([]);
      setDirectLoading(false);
      return;
    }

    const mergeAndSet = () => {
      const merged = new Map<string, ChatRoomItem>();
      directFromParticipantsRef.current.forEach((v, k) => merged.set(k, v));
      directFromUsersRef.current.forEach((v, k) => merged.set(k, v));
      setDirectRooms(Array.from(merged.values()));
      setDirectLoading(false);
    };

    const q1 = query(collection(db, "chats"), where("participants", "array-contains", myUid), limit(60));
    const q2 = query(collection(db, "chats"), where("users", "array-contains", myUid), limit(60));

    let cancelled = false;
    const unsub1 = onSnapshot(
      q1,
      (snap) => {
        if (cancelled) return;
        const m = directFromParticipantsRef.current;
        m.clear();
        snap.docs.forEach((d) => {
          const raw = d.data() as Record<string, unknown>;
          if (raw.mergedInto || raw.status === "archived") return;
          m.set(d.id, normalizeDirectChat(d.id, raw));
        });
        mergeAndSet();
      },
      () => setDirectLoading(false)
    );
    const unsub2 = onSnapshot(
      q2,
      (snap) => {
        if (cancelled) return;
        const m = directFromUsersRef.current;
        m.clear();
        snap.docs.forEach((d) => {
          const raw = d.data() as Record<string, unknown>;
          if (raw.mergedInto || raw.status === "archived") return;
          m.set(d.id, normalizeDirectChat(d.id, raw));
        });
        mergeAndSet();
      },
      () => setDirectLoading(false)
    );

    return () => {
      cancelled = true;
      unsub1();
      unsub2();
    };
  }, [myUid]);

  // 🔥 2️⃣ userChatSettings 실시간 구독 (최적화: reconnect-safe)
  useEffect(() => {
    if (!myUid) return;

    const settingsRef = collection(db, "userChatSettings", myUid, "rooms");
    let isUnmounted = false; // 🔥 cleanup 추적

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (isUnmounted) return; // 🔥 cleanup 후 호출 방지
        const settingsMap: Record<string, ChatSetting> = {};
        snapshot.docs.forEach((doc) => {
          settingsMap[doc.id] = doc.data() as ChatSetting;
        });
        setSettings(settingsMap);
      },
      (error: any) => {
        // 🔥 네트워크 에러는 조용히 처리 (Firebase 자동 재연결)
        if (error.code === "unavailable" || error.code === "deadline-exceeded") {
          return;
        }
        // 🔥 권한 오류만 로그
        if (error.code === "permission-denied") {
          console.error("❌ [ChatListPage] 채팅 설정 조회 권한 없음");
        }
      }
    );

    return () => {
      isUnmounted = true; // 🔥 cleanup 플래그 설정
      unsubscribe(); // 🔥 리스너 해제
    };
  }, [myUid]);

  // 🔥 마지막 메시지 시간 포맷팅 (당근마켓 스타일)
  const formatTime = (timestamp?: any): string => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "방금 전";
      if (diffMins < 60) return `${diffMins}분 전`;
      if (diffHours < 24) return `${diffHours}시간 전`;
      if (diffDays < 7) return `${diffDays}일 전`;
      return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  // 🔥 채팅 고정/숨김 액션 (userChatSettings 사용)
  const togglePin = async (roomId: string, currentPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!myUid) return;
    try {
      const ref = doc(db, "userChatSettings", myUid, "rooms", roomId);
      await setDoc(
        ref,
        {
          pinned: !currentPinned,
          hidden: false, // 고정 시 숨김 해제
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("❌ [ChatListPage] 채팅 고정 실패:", error);
    }
  };

  const hideChat = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!myUid) return;
    if (!confirm("이 채팅을 숨기시겠습니까?")) return;
    try {
      const ref = doc(db, "userChatSettings", myUid, "rooms", roomId);
      await setDoc(
        ref,
        {
          hidden: true,
          pinned: false, // 숨김 시 고정 해제
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("❌ [ChatListPage] 채팅 숨김 실패:", error);
    }
  };

  const unhideChat = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!myUid) return;
    try {
      const ref = doc(db, "userChatSettings", myUid, "rooms", roomId);
      await setDoc(
        ref,
        {
          hidden: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("❌ [ChatListPage] 채팅 숨김 해제 실패:", error);
    }
  };

  // 🔥 숨김 채팅 필터링 + 고정 채팅 정렬 (userChatSettings 기반)
  const visibleRooms = useMemo(() => {
    if (!myUid) return [];

    const merged = rooms.map((room) => {
      const setting = settings[room.id];
      return {
        ...room,
        pinned: setting?.pinned ?? false,
        hidden: setting?.hidden ?? false,
      };
    });

    // 숨김 채팅 필터링 (showHidden이 false면 숨김 제외)
    const filteredByHidden = showHidden
      ? merged
      : merged.filter((r) => !r.hidden);

    // 차단 사용자 필터링
    const filtered = filteredByHidden.filter((r) => {
      // participants 우선, 없으면 members/roles/buyer-seller 순으로 otherUid 추정
      const parts = (r.participants as string[] | undefined) || (r.members as string[] | undefined);
      let otherUid: string | undefined;
      if (Array.isArray(parts) && parts.length >= 2) {
        otherUid = parts.find((u) => u && u !== myUid);
      }
      if (!otherUid && (r.buyerId || r.sellerId)) {
        otherUid = r.buyerId === myUid ? r.sellerId : r.buyerId;
      }
      if (!otherUid && r.roles) {
        const uids = Object.keys(r.roles);
        otherUid = uids.find((u) => u !== myUid);
      }
      // otherUid가 없으면 필터링하지 않음(안전)
      if (!otherUid) return true;
      return !blockedSet.has(otherUid);
    });

    // 정렬: 고정 → 최신 메시지 순
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

      const aTime = a.lastMessageAt?.toDate?.()?.getTime() || 0;
      const bTime = b.lastMessageAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
  }, [rooms, settings, myUid, showHidden, blockedSet]);

  const filteredDirectRooms = useMemo(() => {
    if (!myUid) return [];
    return directRooms.filter((r) => {
      const parts = r.participants || [];
      const other = parts.find((u) => u && u !== myUid);
      if (!other) return true;
      return !blockedSet.has(other);
    });
  }, [directRooms, myUid, blockedSet]);

  const combinedRooms = useMemo(() => {
    const fromRooms = visibleRooms.map((r) => ({
      ...r,
      listSource: (r.listSource || "room") as "room" | "direct",
    }));
    const merged = [...fromRooms, ...filteredDirectRooms];

    /** 동일 상품·동일 판매자/구매자 스레드가 `chatRooms`와 `chats`에 각각 있으면 한 줄만 노출 */
    const tradeThreadKey = (r: ChatRoomItem): string | null => {
      if ((r.type || "") === "recruit_group") return null;
      const pid =
        r.postId ||
        r.productId ||
        (r.productSnapshot as { productId?: string } | undefined)?.productId ||
        "";
      if (!pid || !r.sellerId || !r.buyerId) return null;
      return `${pid}__${[r.sellerId, r.buyerId].sort().join("_")}`;
    };

    const lastMsgTime = (r: ChatRoomItem) => r.lastMessageAt?.toDate?.()?.getTime() ?? 0;

    const deduped = new Map<string, ChatRoomItem>();
    for (const r of merged) {
      const k = tradeThreadKey(r) ?? `__id:${r.id}`;
      const prev = deduped.get(k);
      if (!prev) {
        deduped.set(k, r);
        continue;
      }
      const tPrev = lastMsgTime(prev);
      const tNext = lastMsgTime(r);
      if (tNext > tPrev) deduped.set(k, r);
      else if (tNext === tPrev && r.listSource === "direct" && prev.listSource !== "direct") {
        deduped.set(k, r);
      }
    }

    return Array.from(deduped.values()).sort((a, b) => {
      const ap = a.listSource !== "direct" && (a as any).pinned ? 1 : 0;
      const bp = b.listSource !== "direct" && (b as any).pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const aTime = a.lastMessageAt?.toDate?.()?.getTime() || 0;
      const bTime = b.lastMessageAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
  }, [visibleRooms, filteredDirectRooms]);

  // 🔥 숨김 채팅 개수 계산
  const hiddenCount = useMemo(() => {
    return rooms.filter((room) => settings[room.id]?.hidden).length;
  }, [rooms, settings]);

  const pageLoading = loading || directLoading;

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (combinedRooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="text-6xl mb-4">💬</div>
        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          채팅이 없습니다
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          마켓에서 상품을 둘러보고 판매자와 채팅을 시작해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-neutral-800 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">채팅</h1>
        {/* 🔥 숨김 채팅 토글 버튼 */}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowHidden(!showHidden)}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {showHidden ? "숨김 채팅 닫기" : `숨긴 채팅 보기 (${hiddenCount})`}
          </button>
        )}
      </div>

      {/* 🔔 푸시 알림 안내 배너 */}
      <PushNotificationGuide />

      {/* 채팅 목록 */}
      <div className="flex-1 overflow-y-auto">
        {combinedRooms.map((room) => {
          const isDirect = room.listSource === "direct";
          // 🔥 타입 분기: trade vs recruit_group
          const roomType = room.type || (room.postId ? "recruit_group" : "trade");
          const isRecruitGroup = roomType === "recruit_group";
          const isTrade = roomType === "trade";
          
          // 🔥 모집 단체방: 멤버 수 계산
          const memberCount = isRecruitGroup ? room.members?.length : undefined;
          
          // 🔥 productSnapshot 사용 (products 컬렉션 조회 ❌)
          const product = room.productSnapshot;
          const thumb = product?.imageUrl;
          // 🔥 모집 단체방: postId 기반 제목 표시 (나중에 post 정보 조회 가능)
          const productName = isRecruitGroup 
            ? `모집 단체방${memberCount ? ` (${memberCount}명)` : ""}`
            : (product?.title || "삭제된 상품");
          
          // 🔥 unread 계산: seq 기반 (새 방식) 또는 unreadCount 기반 (하위 호환)
          const lastSeq = (room as any).lastMessageSeq ?? 0;
          const myReadSeq = (room as any).read?.[myUid || ""]?.lastReadSeq ?? 0;
          const unreadFromSeq = Math.max(0, lastSeq - myReadSeq);
          const unreadFromCount = room.unreadCount?.[myUid || ""] ?? 0;
          // 🔥 seq 방식 우선, 없으면 기존 unreadCount 사용 (하위 호환)
          const unread = lastSeq > 0 ? unreadFromSeq : unreadFromCount;
          const isPinned = (room as any).pinned || false;
          const isHidden = (room as any).hidden || false;

          // 🔥 디버깅: unreadCount 확인
          if (process.env.NODE_ENV === "development" && !isDirect) {
            console.log("🔍 [ChatListPage] 채팅방 unreadCount:", {
              roomId: room.id,
              myUid,
              unreadCount: room.unreadCount,
              unread,
            });
          }

          return (
            <div
              key={room.id}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors border-b border-gray-100 dark:border-neutral-800 group relative cursor-pointer"
              onClick={async () => {
                try {
                  const rid = room.id;

                  // 통합방(chatRooms 전용 UI·메시지 경로)
                  if (
                    room.type === "recruit_group" ||
                    room.type === "team" ||
                    rid.startsWith("teamRecruit_") ||
                    rid.startsWith("recruit_")
                  ) {
                    navigate(`/chat/${rid}`);
                    return;
                  }

                  // 거래 1:1 — chats 컬렉션과 `/app/chat/:id` 고정
                  if (isDirect) {
                    navigate(`/app/chat/${normalizeTradeChatDocumentIdForRoute(rid)}`);
                    return;
                  }

                  // chatRooms 목록에 남아 있는 거래 스레드: 정규 ID 또는 trade_* 레거시
                  const chatsDocId = normalizeTradeChatDocumentIdForRoute(rid);
                  const chatRef = doc(db, "chats", chatsDocId);
                  const snap = await getDoc(chatRef);
                  if (snap.exists()) {
                    navigate(`/app/chat/${chatsDocId}`);
                    return;
                  }

                  const sellerId = (room as any).sellerId;
                  const buyerId = (room as any).buyerId;
                  const postId = (room as any).postId || (room as any).productId;
                  if (sellerId && buyerId && postId && myUid) {
                    let sellerResolved = sellerId;
                    try {
                      const owner = await resolveListingOwnerUid(postId);
                      if (owner) sellerResolved = owner;
                    } catch {
                      /* ignore */
                    }
                    const { chatId } = await getOrCreateChat({
                      postId,
                      postTitle: (room as any).productSnapshot?.title || "상품",
                      postImage: (room as any).productSnapshot?.imageUrl || "",
                      sport: (room as any).sport || "all",
                      sellerId: sellerResolved,
                      buyerId,
                      sellerName: (room as any).participantsInfo?.[sellerId]?.name,
                      buyerName: (room as any).participantsInfo?.[buyerId]?.name,
                      sellerAvatar: (room as any).participantsInfo?.[sellerId]?.avatar,
                      buyerAvatar: (room as any).participantsInfo?.[buyerId]?.avatar,
                    });
                    navigate(`/app/chat/${normalizeTradeChatDocumentIdForRoute(chatId)}`);
                  } else {
                    alert("채팅방 정보를 불러올 수 없습니다.");
                  }
                } catch (e) {
                  console.error("❌ 채팅방 진입 실패:", e);
                }
              }}
            >
              {/* 🔥 고정 아이콘 */}
              {isPinned && (
                <div className="flex-shrink-0 text-blue-500 text-lg">📌</div>
              )}

              {/* 🔥 상품 썸네일 (당근마켓 스타일) */}
              <div className="flex-shrink-0 relative">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={productName}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-300 dark:bg-neutral-700 flex items-center justify-center">
                    <span className="text-gray-600 dark:text-gray-300 text-xl">📦</span>
                  </div>
                )}
              </div>

              {/* 채팅 정보 */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                      {productName}
                    </span>
                    {/* 🔥 타입 뱃지 */}
                    {isRecruitGroup && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full flex-shrink-0">
                        모집 {memberCount ? `${memberCount}명` : ""}
                      </span>
                    )}
                    {isTrade && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-700 px-2 py-0.5 rounded-full flex-shrink-0">
                        {isDirect ? "1:1" : "중고거래"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {room.lastMessageAt && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(room.lastMessageAt)}
                      </span>
                    )}
                    {/* 🔥 읽지 않은 메시지 뱃지 */}
                    {unread > 0 && (
                      <div
                        style={{
                          minWidth: 18,
                          height: 18,
                          borderRadius: 9,
                          background: "#EF4444",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 6px",
                        }}
                      >
                        {unread > 99 ? "99+" : unread}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm truncate ${
                      unread > 0
                        ? "font-semibold text-gray-900 dark:text-gray-100"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {/* lastMessage는 문자열 또는 객체(text) 모두 대응 */}
                    {typeof (room as any).lastMessage === "string"
                      ? (room as any).lastMessage
                      : ((room as any).lastMessage?.text || "대화를 시작해보세요")}
                  </span>
                </div>
              </div>

              {/* 🔥 채팅 고정/숨김 메뉴 버튼 (chatRooms 전용) */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                {!isDirect && isHidden ? (
                  <button
                    type="button"
                    onClick={(e) => unhideChat(room.id, e)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700"
                    title="숨김 해제"
                  >
                    👁️‍🗨️
                  </button>
                ) : !isDirect ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => togglePin(room.id, isPinned, e)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700"
                      title={isPinned ? "고정 해제" : "채팅 고정"}
                    >
                      {isPinned ? "📌" : "📍"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => hideChat(room.id, e)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700"
                      title="채팅 숨기기"
                    >
                      👁️
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
