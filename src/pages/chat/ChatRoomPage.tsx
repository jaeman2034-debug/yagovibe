import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  where,
  getDocs,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";
import { uploadChatImage } from "@/features/chat/utils/uploadImage";
import { sendMessage as sendMessageSvc, markAsRead as markAsReadSvc } from "@/features/chat/services/chatService";
import { createReview, hasUserReviewed } from "@/services/reviewService";
import { fetchTradeThreadMemberIdsForChat } from "@/lib/chat/tradeChatThreadMemberIds";

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt?: any;
  type?: "text";
  system?: boolean;
}

function safeText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return "";
  return String(value);
}

function normalizeMessage(raw: any, id: string): ChatMessage {
  return {
    id: safeText(id),
    senderId: safeText(raw?.senderId || raw?.uid || raw?.userId),
    text: safeText(raw?.text),
    createdAt: raw?.createdAt,
    type: raw?.type === "text" ? "text" : undefined,
    system: raw?.system === true,
  };
}

export default function ChatRoomPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [guardChecked, setGuardChecked] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatMeta, setChatMeta] = useState<any>(null);
  const [myBlocked, setMyBlocked] = useState<string[] | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [hasReviewed, setHasReviewed] = useState<boolean>(false);
  const [targetUserRating, setTargetUserRating] = useState<{ avg: number; count: number } | null>(null);
  const [product, setProduct] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSeller = !!(user?.uid && chatMeta?.sellerId && user.uid === chatMeta.sellerId);
  const [updatingStatus, setUpdatingStatus] = useState<null | "reserved" | "done">(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimerRef = useRef<number | null>(null);

  // ⚠️ 의존 변수는 사용 전에 선언(TDZ 방지)
  const isChatClosed = (chatMeta?.tradeStatus || "").toLowerCase() === "sold";
  const otherUserId =
    chatMeta?.participants?.find((id: string) => id !== user?.uid) || null;
  const isBlocked = !!(myBlocked && otherUserId && myBlocked.includes(otherUserId));

  // 🔐 접근 가드: 채팅방 참여자 여부 확인
  useEffect(() => {
    const guard = async () => {
      if (!chatId || !user?.uid) return;
      try {
        const ref = doc(db, "chats", chatId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          alert("채팅방이 존재하지 않습니다.");
          navigate("/market", { replace: true });
          return;
        }
        const data = snap.data();
        if (!Array.isArray(data?.participants) || !data.participants.includes(user.uid)) {
          alert("접근 권한이 없습니다.");
          navigate("/market", { replace: true });
          return;
        }
        setChatMeta({ id: chatId, ...data });
        setGuardChecked(true);
      } catch (e) {
        console.error("❌ 채팅방 접근 가드 실패:", e);
        alert("채팅방에 접근할 수 없습니다.");
        navigate("/market", { replace: true });
      }
    };
    void guard();
  }, [chatId, user?.uid, navigate]);

  // 🔥 내 차단 리스트 구독
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data() as any;
      setMyBlocked((data?.blockedUsers as string[]) || []);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!chatId || !guardChecked) return;

    // 메시지 실시간 구독
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => normalizeMessage(d.data(), d.id));
      setMessages(list);
    });
    return () => unsub();
  }, [chatId, guardChecked]);

  // 🔎 상품 정보 로드 (타이틀 그리드용)
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const pid = chatMeta?.postId;
        if (!pid) {
          setProduct(null);
          return;
        }
        const ps = await getDoc(doc(db, "marketPosts", pid));
        if (ps.exists()) {
          setProduct({ id: ps.id, ...(ps.data() as any) });
        } else {
          setProduct(null);
        }
      } catch (e) {
        console.error("❌ 상품 정보 로드 실패:", e);
      }
    };
    loadProduct();
  }, [chatMeta?.postId]);

  // ⭐ 상대 사용자 평점 로드
  useEffect(() => {
    const loadTargetRating = async () => {
      if (!otherUserId) {
        setTargetUserRating(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", otherUserId));
        if (snap.exists()) {
          const d = snap.data() as any;
          setTargetUserRating({
            avg: Number(d?.ratingAvg || 0),
            count: Number(d?.reviewCount || 0),
          });
        } else {
          setTargetUserRating(null);
        }
      } catch {
        setTargetUserRating(null);
      }
    };
    void loadTargetRating();
  }, [otherUserId]);

  // 🔥 스크롤을 항상 하단으로 이동
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // 🔔 chat 메타 실시간 구독 (읽음/상태 변화 반영)
  useEffect(() => {
    if (!chatId) return;
    const unsub = onSnapshot(doc(db, "chats", chatId), (snap) => {
      if (snap.exists()) {
        setChatMeta({ id: chatId, ...(snap.data() as any) });
      }
    });
    return () => unsub();
  }, [chatId]);

  // 🟢 lastActiveAt 업데이트 (입장/포커스 시)
  useEffect(() => {
    if (!user?.uid) return;
    const touch = async () => {
      try {
        await updateDoc(doc(db, "users", user.uid), { lastActiveAt: serverTimestamp() });
      } catch {}
    };
    touch();
    const onFocus = () => touch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.uid]);

  // ✍️ typing 상태 구독(상대)
  useEffect(() => {
    if (!chatId || !otherUserId) return;
    const ref = doc(db, "chats", chatId, "typing", otherUserId);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() as any;
      if (!data) {
        setOtherTyping(false);
        return;
      }
      const updatedAt = data.updatedAt?.toDate?.()?.getTime?.() || 0;
      const isFresh = Date.now() - updatedAt < 5000;
      setOtherTyping(!!data.isTyping && isFresh);
    });
    return () => unsub();
  }, [chatId, otherUserId]);

  // ✍️ typing 상태 전송(본인)
  const touchTyping = async (flag: boolean) => {
    if (!chatId || !user?.uid) return;
    try {
      await setDoc(
        doc(db, "chats", chatId, "typing", user.uid),
        { isTyping: flag, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch {}
  };

  const updateStatus = async (status: "reserved" | "done") => {
    if (!chatId || !chatMeta?.postId) return;
    try {
      setUpdatingStatus(status);
      // posts 업데이트
      await updateDoc(doc(db, "marketPosts", chatMeta.postId), { status });
      // chats 업데이트
      await updateDoc(doc(db, "chats", chatId), { tradeStatus: status, updatedAt: serverTimestamp() });
      // 로컬 메타 즉시 반영(지각 업데이트 보완)
      setChatMeta((prev: any) => ({ ...(prev || {}), tradeStatus: status }));
      // 시스템 메시지(선택)
      const tmStatus = await fetchTradeThreadMemberIdsForChat(chatId);
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user?.uid || "system",
        type: "system_status",
        text: status === "done" ? "거래가 완료되었습니다." : "예약 상태로 변경되었습니다.",
        createdAt: serverTimestamp(),
        readBy: user?.uid ? { [user.uid]: serverTimestamp() } : {},
        ...(tmStatus ? { threadMemberIds: tmStatus } : {}),
      });
      // ✅ UX: 토스트 + 목록 복귀
      try {
        const { toast } = await import("@/lib/notify");
        toast.success(status === "done" ? "거래가 완료되었습니다" : "예약중으로 변경되었습니다");
      } catch {}
      if (status === "done") {
        // 완료 시 입력창 비활성화를 즉시 느낄 수 있도록 현재 화면 유지
      }
    } catch (e) {
      console.error("❌ 거래 상태 변경 실패:", e);
      alert("상태 변경에 실패했습니다.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // 🔓 차단 해제
  const handleUnblock = async () => {
    if (!user?.uid || !otherUserId) return;
    try {
      // 기존 users 문서의 배열에서 제거 (구형 구조 호환)
      await updateDoc(doc(db, "users", user.uid), {
        blockedUsers: arrayRemove(otherUserId),
      });
      // 서브컬렉션 방식도 함께 삭제 (신형 구조 호환)
      await deleteDoc(doc(db, "users", user.uid, "blockedUsers", otherUserId));
      alert("차단이 해제되었습니다.");
    } catch (e) {
      console.error("❌ 차단 해제 실패:", e);
      alert("차단 해제 중 오류가 발생했습니다.");
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user?.uid || !chatId) return;
    if (isChatClosed) {
      alert("거래가 완료된 채팅입니다.");
      return;
    }
    if (isBlocked) {
      alert("차단한 사용자와는 대화할 수 없습니다.");
      return;
    }
    try {
      await sendMessageSvc({
        chatId,
        senderId: user.uid,
        receiverId: otherUserId,
        text,
      });
      setInput("");
      void touchTyping(false);
    } catch (err) {
      console.error("❌ 메시지 전송 실패:", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid || !chatId) return;
    if (isChatClosed) {
      alert("거래가 완료된 채팅입니다.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (isBlocked) {
      alert("차단한 사용자와는 대화할 수 없습니다.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const uploadPath = `chat/${chatId}`;
      console.log("📤 [Chat] image upload path:", uploadPath, "file:", file.name, "type:", file.type);
      const imageUrl = await uploadChatImage(file, uploadPath);
      const tmImg = await fetchTradeThreadMemberIdsForChat(chatId);
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid,
        type: "image",
        imageUrl,
        createdAt: serverTimestamp(),
        readBy: { [user.uid]: serverTimestamp() },
        ...(tmImg ? { threadMemberIds: tmImg } : {}),
      });
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: {
          text: "📷 사진",
          senderId: user.uid,
          type: "image",
          createdAt: serverTimestamp(),
        },
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        lastMessageRead: false,
        ...(otherUserId ? { [`unreadCount.${otherUserId}`]: increment(1) } : {}),
        [`unreadCount.${user.uid}`]: 0,
        [`readBy.${user.uid}`]: serverTimestamp(),
      });
      // reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("❌ 이미지 업로드 실패:", err);
      alert("이미지 업로드 실패");
    }
  };

  // 🔥 읽음 처리: 서비스 경로로 단일화 (unreadCount 0)
  useEffect(() => {
    if (!chatId || !user?.uid) return;
    void markAsReadSvc(chatId, user.uid);
  }, [messages.length, chatId, user?.uid]);

  // 🔥 리뷰 중복 검사: 거래완료 후, 현재 유저가 이 채팅/거래에 리뷰를 남겼는지 확인
  useEffect(() => {
    const checkReviewed = async () => {
      if (!chatId || !user?.uid || (chatMeta?.tradeStatus || "") !== "done") return;
      try {
        const reviewed = await hasUserReviewed({ chatId, reviewerId: user.uid });
        setHasReviewed(reviewed);
      } catch (e) {
        console.error("❌ 리뷰 중복 검사 실패:", e);
      }
    };
    void checkReviewed();
  }, [chatId, user?.uid, chatMeta?.tradeStatus]);

  const submitReview = async () => {
    if (!user?.uid || !chatId || rating <= 0) {
      alert("별점을 선택해주세요.");
      return;
    }
    if ((chatMeta?.tradeStatus || "") !== "done") {
      alert("거래 완료된 후기에만 작성할 수 있습니다.");
      return;
    }
    if (!otherUserId) return;
    try {
      await createReview({
        reviewerId: user.uid,
        targetUserId: otherUserId,
        postId: chatMeta?.postId || null,
        chatId,
        rating,
        comment,
      });
      setHasReviewed(true);
      setRating(0);
      setComment("");
      try {
        const { toast } = await import("@/lib/notify");
        toast.success("리뷰가 등록되었습니다.");
      } catch {
        alert("리뷰가 등록되었습니다.");
      }
    } catch (e) {
      console.error("❌ 리뷰 등록 실패:", e);
      alert("리뷰 등록 중 오류가 발생했습니다.");
    }
  };

  if (!chatId) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-600">채팅방을 찾을 수 없습니다.</p>
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => navigate(-1)}>
          뒤로가기
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] md:h-[calc(100vh-56px)] flex bg-gray-50">
      {/* 좌측 상품 패널 (md 이상) */}
      {product && (
        <aside className="hidden md:flex w-80 flex-col border-r bg-white pt-[calc(var(--header-h,56px)+40px)]">
          <div className="p-4 border-b">
            <div className="w-full rounded-lg overflow-hidden bg-gray-100">
              {product.imageUrl || (product.images && product.images[0]) ? (
                <img
                  src={product.imageUrl || product.images[0]}
                  alt=""
                  className="w-full aspect-[4/3] object-cover"
                />
              ) : (
                <div className="w-full h-48 flex items-center justify-center text-gray-400 text-2xl">
                  📦
                </div>
              )}
            </div>
            <div className="mt-3">
            <div className="space-y-1">
              {/* 제목 */}
              <div className="font-semibold text-base text-gray-900 truncate">
                {safeText(product.title || product.name) || "상품"}
              </div>
              {/* 가격 (핵심) */}
              {typeof product.price === "number" && (
                <div className="text-lg font-bold text-gray-900">
                  {product.price.toLocaleString()}원
                </div>
              )}
              {/* 상태 (메타) */}
              <div className="text-sm">
                <span
                  className={`inline-block px-2 py-0.5 rounded border ${
                    (chatMeta?.tradeStatus || "active") === "active"
                      ? "bg-gray-50 text-gray-700 border-gray-200"
                      : chatMeta?.tradeStatus === "reserved"
                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                      : "bg-green-50 text-green-700 border-green-200"
                  }`}
                >
                  {(chatMeta?.tradeStatus || "active") === "active" && "판매중"}
                  {chatMeta?.tradeStatus === "reserved" && "예약중"}
                  {chatMeta?.tradeStatus === "done" && "거래완료"}
                </span>
              </div>
              {/* 평점 (신뢰) */}
              {targetUserRating && (
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  ⭐ {targetUserRating.avg?.toFixed?.(1) || "0.0"}
                  <span className="text-gray-400">(후기 {safeText(targetUserRating.count)})</span>
                </div>
              )}
            </div>
              {product.id && (
                <button
                  className="mt-2 w-full text-xs border rounded py-2 hover:bg-gray-50"
                  onClick={() => navigate(`/market/${product.id}`)}
                >
                  상품 상세 보기
                </button>
              )}
              {otherUserId && (
                <button
                  className="mt-2 w-full text-xs border rounded py-2 hover:bg-gray-50"
                  onClick={() => navigate(`/profile/${otherUserId}`)}
                >
                  채팅 상대 프로필
                </button>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* 우측 채팅 영역 */}
      <div className="flex-1 h-full flex flex-col bg-white border-x border-gray-200" style={{ maxWidth: "1024px", margin: "0 auto" }}>
      <div
        className="sticky z-50 h-12 px-4 border-b flex items-center justify-between bg-white shadow-sm"
        style={{ top: "calc(var(--header-h, 56px) + env(safe-area-inset-top, 0px) + 64px)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{safeText(chatMeta?.postTitle) || "채팅"}</p>
              {otherUserId && (
                <button
                  onClick={() => navigate(`/profile/${otherUserId}`)}
                  className="text-xs text-blue-600 underline-offset-2 hover:underline"
                >
                  상대 프로필
                </button>
              )}
            </div>
          {product && (
            <button
              onClick={() => product?.id && navigate(`/market/${product.id}`)}
              className="mt-0.5 group flex items-center gap-2 min-w-0"
              title="상품 상세 보기"
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                {product.imageUrl || (product.images && product.images[0]) ? (
                  <img
                    src={product.imageUrl || product.images[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">📦</div>
                )}
              </div>
              <span className="text-xs text-gray-700 truncate max-w-[10rem] md:max-w-[14rem] group-hover:underline">
                {safeText(product.title || product.name) || "상품"}
              </span>
              {typeof product.price === "number" && (
                <span className="text-xs font-semibold text-gray-900">
                  {Number(product.price).toLocaleString()}원
                </span>
              )}
            </button>
          )}
          <div className="flex items-center gap-2">
            {otherTyping ? (
              <span className="text-[11px] text-blue-600">상대가 입력 중…</span>
            ) : null}
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                chatMeta?.tradeStatus === "done"
                  ? "text-green-700 bg-green-50 border-green-200"
                  : chatMeta?.tradeStatus === "reserved"
                  ? "text-yellow-700 bg-yellow-50 border-yellow-200"
                  : "text-gray-700 bg-gray-50 border-gray-200"
              }`}>
                {(chatMeta?.tradeStatus || "active") === "active" && "판매중"}
                {chatMeta?.tradeStatus === "reserved" && "예약중"}
                {chatMeta?.tradeStatus === "done" && "거래완료"}
              </span>
              {product?.price && (
                <span className="text-xs text-gray-600">
                  {Number(product.price).toLocaleString()}원
                </span>
              )}
            </div>
            {targetUserRating && (
              <p className="text-xs text-gray-500">
                ⭐ {targetUserRating.avg?.toFixed?.(1) || "0.0"} · 후기 {safeText(targetUserRating.count)}
              </p>
            )}
            {hasReviewed && (chatMeta?.tradeStatus === "done") && (
              <p className="text-xs text-green-600">후기 작성 완료</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 신고/차단 */}
          {otherUserId && (
            <>
              <button
                onClick={async () => {
                  if (!user?.uid || !otherUserId) return;
                  const reason = window.prompt("신고 사유를 입력하세요");
                  if (!reason) return;
                  try {
                    await addDoc(collection(db, "reports"), {
                      reporterId: user.uid,
                      targetUserId: otherUserId,
                      postId: chatMeta?.postId || null,
                      chatId: chatId || null,
                      reason,
                      createdAt: serverTimestamp(),
                    });
                    alert("신고가 접수되었습니다.");
                  } catch (e) {
                    console.error("❌ 신고 실패:", e);
                    alert("신고 처리 중 오류가 발생했습니다.");
                  }
                }}
                className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
              >
                신고
              </button>
              {!isBlocked ? (
                <button
                  onClick={async () => {
                    if (!user?.uid || !otherUserId) return;
                    try {
                      await updateDoc(doc(db, "users", user.uid), {
                        blockedUsers: arrayUnion(otherUserId),
                      });
                      alert("차단되었습니다.");
                    } catch (e) {
                      console.error("❌ 차단 실패:", e);
                      alert("차단 처리 중 오류가 발생했습니다.");
                    }
                  }}
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  차단
                </button>
              ) : (
                <button
                  onClick={handleUnblock}
                  className="px-3 py-1.5 bg-gray-100 rounded-md text-xs text-blue-600 hover:bg-gray-200 transition-colors"
                >
                  차단 해제
                </button>
              )}
            </>
          )}
          {isSeller && chatMeta?.tradeStatus !== "done" && (
            <div className="hidden sm:flex gap-2">
              <button
                onClick={() => updateStatus("reserved")}
                className="px-3 py-1 bg-yellow-400 rounded text-xs disabled:opacity-50"
                disabled={!!updatingStatus}
              >
                {updatingStatus === "reserved" ? "처리 중..." : "예약하기"}
              </button>
              <button
                onClick={() => updateStatus("done")}
                className="px-3 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                disabled={!!updatingStatus}
              >
                {updatingStatus === "done" ? "처리 중..." : "거래 완료"}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* 🧩 상품 타이틀 그리드 (모바일 우선 간결형) */}
      {/* 중간 여백 섹션 제거 → 헤더 보더만 유지 */}
      <div className="bg-white flex-1 overflow-y-auto pt-[calc(var(--header-h,56px)+64px)] pb-24 pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-col px-4 py-6 min-h-full max-w-2xl mx-auto">
          {messages.map((message, idx) => {
            const isMine = message.senderId === user?.uid;
            const prev = messages[idx - 1] as any;
            const next = messages[idx + 1] as any;
            const isSameUser = !!prev && prev.senderId === (message as any).senderId;
            const isLastOfGroup = !next || next.senderId !== (message as any).senderId;
            const senderName = safeText((message as any).senderName) || "상대";
            const timeLabel =
              (message as any)?.createdAt?.toDate?.()?.toLocaleTimeString?.([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "";

            // 시스템 메시지 렌더링 (가운데 회색 작은 텍스트)
            if ((message as any).system || (message as any).type === "system" || (message as any).type === "system_status") {
              return (
                <div key={message.id} className="w-full text-center text-xs text-gray-400 my-2">
                  {safeText((message as any).text) || "안내 메시지"}
                </div>
              );
            }
            return (
              <div
                key={message.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                {!isMine && !isSameUser && (
                  <p className="text-xs text-gray-400 mb-1 px-1">{safeText(senderName)}</p>
                )}
                <div
                  className={`
                    max-w-[70%] px-3 py-2 text-sm break-words
                    ${isMine
                      ? "bg-blue-600 text-white rounded-2xl rounded-br-md"
                      : "bg-gray-100 text-black rounded-2xl rounded-bl-md"}
                    ${isSameUser ? "mt-1" : "mt-3"}
                  `}
                >
                  {(message as any).type === "image" ? (
                    <img
                      src={(message as any).imageUrl}
                      alt="chat"
                      className="max-w-[220px] h-auto rounded-xl object-cover cursor-pointer"
                      onClick={() => {
                        const url = (message as any).imageUrl;
                        if (url) window.open(url, "_blank");
                      }}
                    />
                  ) : (
                    safeText((message as any).text)
                  )}
                </div>
                {isLastOfGroup && (
                  <span className="text-[10px] text-gray-400 mt-1 px-1">{safeText(timeLabel)}</span>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
      {/* 🔥 거래완료 후 리뷰 작성 영역 (내가 아직 작성 안 한 경우) */}
      {chatMeta?.tradeStatus === "sold" && !hasReviewed && (
        <div className="bg-white px-4 py-3">
          <p className="text-sm mb-2">거래는 어떠셨나요?</p>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`text-xl ${rating >= n ? "text-yellow-400" : "text-gray-300"}`}
                aria-label={`${n}점`}
              >
                ⭐
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="후기를 남겨주세요"
            className="chat-input-textarea w-full border rounded p-2 text-sm"
            rows={3}
          />
          <button
            onClick={submitReview}
            className="mt-2 w-full bg-blue-600 text-white py-2 rounded"
          >
            작성하기
          </button>
        </div>
      )}
      {/* 모바일 전용 거래 CTA (판매자만) */}
      {isSeller && chatMeta?.tradeStatus !== "done" && (
        <div className="sm:hidden sticky bottom-[56px] z-40 bg-white px-3 py-2 flex gap-2 justify-end">
          <button
            onClick={() => updateStatus("reserved")}
            className="px-3 py-1 bg-yellow-400 rounded text-xs disabled:opacity-50"
            disabled={!!updatingStatus}
          >
            {updatingStatus === "reserved" ? "처리 중..." : "예약하기"}
          </button>
          <button
            onClick={() => updateStatus("done")}
            className="px-3 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
            disabled={!!updatingStatus}
          >
            {updatingStatus === "done" ? "처리 중..." : "거래 완료"}
          </button>
        </div>
      )}

      <div className="bg-white border-t p-2 md:p-3 sticky bottom-0 pb-[env(safe-area-inset-bottom)] flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          id="chat-image"
        />
        <label htmlFor="chat-image" className="px-2 cursor-pointer select-none text-xl">
          📷
        </label>
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            void touchTyping(true);
            if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
            typingTimerRef.current = window.setTimeout(() => {
              void touchTyping(false);
              typingTimerRef.current = null;
            }, 1500);
          }}
          placeholder={isChatClosed ? "거래가 완료된 채팅입니다" : "메시지 입력..."}
          onFocus={() => {
            setTimeout(() => {
              bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            }, 300);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isChatClosed) sendMessage();
          }}
          className="flex-1 border rounded-full px-3 py-2 text-sm max-w-2xl disabled:bg-gray-100"
          disabled={isChatClosed}
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 text-white rounded-full disabled:opacity-50"
          disabled={isChatClosed}
        >
          전송
        </button>
      </div>
      {/* ✅ 마지막 메시지 읽음 배지 */}
      {(() => {
        const last = messages[messages.length - 1] as any;
        const isMine = !!(last && user?.uid && last.senderId === user.uid);
        const otherUnread = chatMeta?.unreadCount?.[otherUserId || ""] ?? undefined;
        const isRead = isMine && otherUnread === 0;
        return isRead ? (
          <div className="px-3 py-1 text-[11px] text-gray-500 text-right">✔✔ 읽음</div>
        ) : null;
      })()}
      </div>
    </div>
  );
}

