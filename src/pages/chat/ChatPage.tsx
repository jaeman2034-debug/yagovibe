/**
 * 🔥 당근마켓 스타일 채팅 페이지
 * 
 * 특징:
 * - 상단에 상품 카드 고정
 * - 실시간 Firestore 메시지
 * - 당근마켓 스타일 말풍선
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { getUserLocation } from "@/lib/getUserLocation";
import RecruitGroupChatHeader from "./components/RecruitGroupChatHeader";
import TeamChatHeader from "./components/TeamChatHeader";
import PinnedNoticeHeader from "./components/PinnedNoticeHeader";
import HostPanel from "./components/HostPanel";
import { useSTT } from "@/hooks/useSTT";
import { playTTS, stopTTS } from "@/utils/playTTS";
import { getChatSummary } from "@/utils/chatSummary";
import { getChatSuggestions } from "@/utils/chatSuggestions";
import { useChatRead } from "@/hooks/useChatRead";
import { useTTS } from "@/hooks/useTTS";
import { useMediaViewer } from "@/hooks/useMediaViewer";
import MediaViewer from "./components/MediaViewer";
import { useMobileKeyboardFix } from "@/features/chat/hooks/useMobileKeyboardFix";
import { useChatInput } from "@/features/chat/hooks/useChatInput";
import { useMessages } from "@/features/chat/hooks/useMessages";
import { useChatRoom } from "@/features/chat/hooks/useChatRoom";
import { useChatSend } from "@/features/chat/hooks/useChatSend";
import { useTradeReservation } from "@/features/chat/hooks/useTradeReservation";
import {
  TTSSummaryButton,
  SuggestionBar,
  ChatInputBar,
  EmptyMessageList,
  MessageListContainer,
  MatchChatHeader,
  TradeChatHeader,
  TradeClosedNotice,
  STTGuideBottomSheet,
  PWAInstallBanner,
  TradeMessageRenderer,
  RecruitGroupMessageRenderer,
  VirtualizedMessageList,
} from "@/features/chat/components";
import type { VirtualizedMessageListHandle } from "@/features/chat/components";
// ⚠️ 순환 참조 방지: speech.ts import 제거, 인라인으로 처리
// import { isIOS, isPWA, canUseSTT as checkCanUseSTT } from "@/utils/speech";
// ⚠️ 동적 import로 순환 참조 방지
// import { trackSTT, trackTTS, trackSuggestion } from "@/lib/eventLog";

type ChatRoomDoc = {
  // 🔥 통합 모델: type 필드로 모집/거래/팀 구분
  type?: "recruit_group" | "trade" | "team" | "match";
  // 🔥 팀 채팅 필드
  teamId?: string;
  // 🔥 통합 모델: members 배열 (모집 단체방과 공통)
  members?: string[];
  // 🔥 통합 모델: roles 객체 (모집 단체방과 공통)
  roles?: { [uid: string]: "host" | "admin" | "member" | "seller" | "buyer" };
  // 🔥 강퇴된 사용자 (재입장 차단)
  banned?: { [uid: string]: boolean };
  // 🔥 모집 단체방 상태 (하위 호환)
  status?: "closed" | "active" | null;
  // 🔥 모집 상태 (표준)
  recruitStatus?: "OPEN" | "CLOSED";
  // 🔥 하위 호환: 기존 중고거래 필드 유지
  productId?: string;
  buyerId?: string;
  sellerId?: string;
  participants?: string[];
  // 🔥 모집 채팅방용 필드
  postId?: string;
  authorId?: string;
  lastMessage?: string;
  // 🔥 읽지 않은 메시지 수
  unreadCount?: { [uid: string]: number };
  productSnapshot?: {
    productId?: string;
    title?: string;
    price?: number;
    imageUrl?: string;
    status?: "ACTIVE" | "SOLD" | "DELETED" | "RESERVED"; // 🔥 RESERVED 상태 추가
  };
};

type MessageDoc = {
  id: string;
  senderId: string;
  text?: string; // 🔥 위치 공유: text는 선택적
  type?: "message" | "system" | "image" | "video" | "notice" | "event" | "summary" | "report" | "attendance";
  images?: Array<{
    url: string;
    thumbUrl: string;
    width: number;
    height: number;
  }>;
  videos?: Array<{
    url: string;
    thumbUrl: string;
    duration: number;
    size: number;
  }>;
  location?: { // 🔥 위치 공유: 위치 메시지 타입
    lat: number;
    lng: number;
    address?: string;
  };
  createdAt?: any;
  // 🔥 전송 중 상태 (임시 메시지)
  pending?: boolean;
  // 🔥 읽음 표시 (카톡 스타일)
  readBy?: string[];
  // 🔥 리액션 (이모지 반응)
  reactions?: { [emoji: string]: string[] };
};

type ProductDoc = {
  title?: string;
  name?: string;
  price?: number;
  images?: string[];
  imageUrl?: string;
  status?: "selling" | "reserved" | "sold";
};


export default function ChatPage() {
  const { chatRoomId } = useParams<{ chatRoomId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightMessageId = searchParams.get("messageId")?.trim() || null;
  const { user } = useAuth();
  const myUid = user?.uid ?? "";

  const { room, product, productMissing, productStatus, isRoomLoading } = useChatRoom({
    chatRoomId,
    myUid,
    navigate,
  });
  const { text, setText, suggestions, setSuggestions, isLoadingSuggestions, setIsLoadingSuggestions, handleTextChange, handleSuggestionSelect } = useChatInput();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSTTGuide, setShowSTTGuide] = useState(false);
  const [autoTTS, setAutoTTS] = useState(false); // 🔥 자동 읽기 모드
  const [isUploadingVideos, setIsUploadingVideos] = useState(false);
  const mediaViewer = useMediaViewer();
  const shareLocationRef = useRef(false); // 🔥 위치 공유 중복 실행 방지 (무한 루프 방지)

  // 🔥 인라인 유틸 함수 (컴포넌트 내부, 순환 참조 방지)
  // ⚠️ useMemo 제거 - 함수로 직접 계산 (초기화 순서 문제 해결)
  const getIsIOS = () => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  };

  const getIsPWA = () => {
    if (typeof window === 'undefined') return false;
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      ((window.navigator as any).standalone) ||
      document.referrer.includes('android-app://')
    );
  };

  const getIsSpeechSupported = () => {
    if (typeof window === 'undefined') return false;
    return (
      'webkitSpeechRecognition' in window ||
      'SpeechRecognition' in window
    );
  };

  const getCanUseSTT = () => {
    if (!getIsSpeechSupported()) return false;
    if (!getIsIOS()) return true; // Android는 항상 가능
    return getIsIOS() && getIsPWA(); // iOS는 PWA일 때만 가능
  };

  const listRef = useRef<HTMLDivElement | null>(null);
  const tradeVirtualizedRef = useRef<VirtualizedMessageListHandle>(null);
  const highlightSessionRef = useRef<{ key: string | null; handled: boolean }>({
    key: null,
    handled: false,
  });
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  // 🔥 모바일/iOS 키보드 대응 (--vh 변수, 스크롤 보정)
  useMobileKeyboardFix(listRef);

  // 🎤 STT 훅 사용 (먼저 선언 - TDZ 방지)
  const { startSTT, stopSTT, listening: isListening, isSupported: isSTTSupported } = useSTT({
    lang: "ko-KR",
    onError: async (error: any) => {
      console.warn("🎤 [ChatPage] STT 오류:", error);
      const errorCode = error?.error || "unknown";
      
      // 📊 이벤트 로그: STT 오류 (no-speech 제외)
      if (errorCode !== "no-speech") {
        const meta = {
          page: "chat",
          chatRoomId: chatRoomId || null,
          platform: getIsIOS() ? "ios" : "android",
          isPWA: getIsPWA(),
        };
        const { trackSTT } = await import("@/lib/eventLog");
        await trackSTT.error(errorCode, meta);
      } else {
        console.log("🎤 [ChatPage] 음성이 감지되지 않음 (정상)");
      }
      // 다른 오류는 기본 처리 (useSTT에서 이미 alert 처리)
    },
  });

  // 🔥 STT 사용 가능 여부 (isSTTSupported 선언 후에 정의 - TDZ 방지)
  // ⚠️ 안전 가드: 모든 값이 정의된 후에만 계산
  const getCanUseSTTValue = useCallback(() => {
    try {
      if (typeof isSTTSupported === 'undefined') return false;
      return getCanUseSTT() && isSTTSupported;
    } catch (error) {
      console.warn("🎤 [ChatPage] getCanUseSTTValue 오류:", error);
      return false;
    }
  }, [isSTTSupported]);

  // 🎤 STT 지원 여부 확인 (디버깅용)
  useEffect(() => {
    const isSupported = 
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
    
    console.log("🎤 [ChatPage] STT 지원 여부:", {
      supported: isSupported,
      webkitSpeechRecognition: "webkitSpeechRecognition" in window,
      SpeechRecognition: "SpeechRecognition" in window,
      userAgent: navigator.userAgent,
    });
  }, []);

  // 🔥 타입 분기: 모집 단체방 vs 중고거래
  const roomType = useMemo(() => {
    if (chatRoomId?.startsWith("match_")) return "match";
    if (!room) return null;
    if (room.type === "match") return "match";
    return room.type || (room.postId ? "recruit_group" : "trade");
  }, [room, chatRoomId]);

  const isRecruitGroup = roomType === "recruit_group";
  const isTrade = roomType === "trade";
  const isTeam = roomType === "team";
  const isMatch = roomType === "match";
  
  // 🔥 P1-2: 삭제된 채팅방 확인 (방 상태 필드 통일)
  const isDeletedRoom = useMemo(() => {
    if (!room) return false;
    if (room.type === "match" || chatRoomId?.startsWith("match_")) {
      return false;
    }

    // 🔥 P1-2: status 필드로 통일 (Trade/Recruit 공통)
    // roomStatus: "active" | "closed" | null
    const roomStatus = room.status;
    if (roomStatus === "closed") {
      return true;
    }
    
    // 🔥 하위 호환: 기존 필드도 확인 (마이그레이션 전)
    // Trade: productSnapshot 상태
    if (isTrade && room.productSnapshot) {
      const snapshot = room.productSnapshot;
      if (snapshot.status === "DELETED" || snapshot.status === "SOLD") {
        return true;
      }
    }
    
    // 🔥 Recruit: postSnapshot 상태 + postDeletedAt
    if (isRecruitGroup && (room as any).postSnapshot) {
      const snapshot = (room as any).postSnapshot;
      if (snapshot.status === "CLOSED" || snapshot.postDeletedAt) {
        return true;
      }
    }
    
    // 🔥 레거시: recruitStatus 필드 (마이그레이션 전)
    if (isRecruitGroup && (room as any).recruitStatus === "CLOSED") {
      return true;
    }
    
    return false;
  }, [room, isTrade, isRecruitGroup, chatRoomId]);
  
  // 🔥 모든 hooks를 early return 전에 호출 (React Hooks 규칙 준수)
  // ⚠️ useMemo는 항상 호출되어야 하므로, 내부에서만 조건 처리
  const otherUid = useMemo(() => {
    if (!room || !myUid || !isTrade) return "";
    return room.buyerId === myUid ? room.sellerId : room.buyerId;
  }, [room, myUid, isTrade]);

  // 🤖 추천 문장: 내가 구매자인지 판매자인지 확인
  const isBuyer = useMemo(() => {
    if (!room || !myUid) return false;
    return room.buyerId === myUid;
  }, [room, myUid]);

  // 🔥 추천 문장: text ref (의존성 무한루프 방지)
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // 🔥 TTS 훅 (handleNewMessage보다 먼저)
  const { speak, stop, supported: ttsSupported } = useTTS({
    lang: "ko-KR",
    rate: 1,
    pitch: 1,
    volume: 0.8,
  });

  const handleNewMessage = useCallback(
    (msg: import("@/features/chat/hooks/useMessages").MessageDoc) => {
      if (autoTTS && ttsSupported && msg.text?.trim()) {
        setTimeout(() => speak(msg.text!), 500);
      }
    },
    [autoTTS, ttsSupported, speak]
  );

  const {
    messages,
    setMessages,
    isLoadingOlder,
    hasMore,
    loadOlderMessages,
  } = useMessages({
    chatRoomId,
    myUid,
    onNewMessage: handleNewMessage,
  });

  const {
    sendTextMessage,
    sendQuickMessage,
    sendVoiceMessage,
    handleImageSelect,
    isUploadingImages,
  } = useChatSend({
    chatRoomId,
    myUid,
    room,
    setMessages,
    setText,
    navigate,
    roomType,
    isTrade,
    isRecruitGroup,
    isMatchThread: isMatch,
  });

  const {
    reserveProduct,
    cancelReservation,
    isReserving,
  } = useTradeReservation({
    chatRoomId,
    productId: room?.productId,
    room,
    myUid,
    isTrade,
    isBuyer,
  });

  /** 고정 입력창(bottom-16) 높이에 맞춰 리스트만 스크롤 패딩 — pb 중복 제거 */
  const scrollBottomInsetPx = useMemo(() => {
    let h = 96;
    if (suggestions.length > 0 && text.trim().length === 0) h += 52;
    if (isTrade && productMissing) h += 36;
    return h;
  }, [suggestions.length, text, isTrade, productMissing]);

  // 🤖 추천 문장 로드 (messages 사용 - useMessages 이후)
  useEffect(() => {
    if (isMatch) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }
    if (!messages.length || !myUid) {
      setSuggestions([]);
      return;
    }
    if (textRef.current.trim().length > 0) {
      setSuggestions([]);
      return;
    }
    setIsLoadingSuggestions(true);
    const ps = productStatus === "RESERVED" ? "ACTIVE" : (productStatus || "ACTIVE");
    getChatSuggestions({
      messages,
      myUid,
      isBuyer,
      productStatus: ps as "ACTIVE" | "SOLD" | "DELETED",
      useAI: false,
    })
      .then((sugs) => {
        // 🔥 text가 변경되었는지 다시 확인 (비동기 완료 후)
        if (textRef.current.trim().length > 0) {
          setSuggestions([]);
          setIsLoadingSuggestions(false);
          return;
        }
        setSuggestions(sugs);
        setIsLoadingSuggestions(false);
      })
      .catch((error) => {
        console.warn("🤖 [ChatPage] 추천 문장 로드 실패:", error);
        setIsLoadingSuggestions(false);
      });
  }, [messages.length, myUid, isBuyer, productStatus, isMatch]);

  // 🔥 채팅방 진입 시 즉시 읽음 처리 (1회만)
  const hasMarkedReadOnMountRef = useRef(false);
  useEffect(() => {
    if (!chatRoomId || !myUid || hasMarkedReadOnMountRef.current) return;
    
    // 🔥 채팅방 진입 시 즉시 읽음 처리 (스크롤 위치와 무관)
    const markReadOnMount = async () => {
      try {
        const { markRoomRead } = await import("@/lib/chat/markRoomRead");
        await markRoomRead(chatRoomId, myUid);
        hasMarkedReadOnMountRef.current = true;
        console.log("✅ [ChatPage] 채팅방 진입 시 읽음 처리 완료");
      } catch (error) {
        console.warn("⚠️ [ChatPage] 채팅방 진입 시 읽음 처리 실패:", error);
      }
    };
    
    // 약간의 딜레이를 주어 방 정보 로드 후 실행
    const timer = setTimeout(markReadOnMount, 500);
    return () => clearTimeout(timer);
  }, [chatRoomId, myUid]);

  // 🔥 스크롤 기반 읽음 처리 훅
  const { bottomRef, onScroll, isAtBottom, scrollToBottom } = useChatRead({
    roomId: chatRoomId || "",
    me: myUid || "",
    messages,
  });

  const useVirtuosoMessageList = useMemo(
    () => !isRecruitGroup && !isTeam && !isMatch,
    [isRecruitGroup, isTeam, isMatch]
  );

  useEffect(() => {
    highlightSessionRef.current = { key: null, handled: false };
    setActiveHighlightId(null);
  }, [chatRoomId]);

  /** `?messageId=` 가 현재 로드된 messages 안에서의 인덱스 (-1: 없음·로딩 구분은 length로) */
  const highlightTargetIndex = useMemo(() => {
    if (!highlightMessageId) return null;
    return messages.findIndex((m) => String(m?.id ?? "") === highlightMessageId);
  }, [highlightMessageId, messages]);

  /**
   * 알림 `?messageId=`
   * - 거래: Virtuoso `scrollToIndex` (index 기반)
   * - 모집·팀: DOM `data-message-id` + scrollIntoView
   * - 가상 스크롤: 스크롤 직후 rAF로 하이라이트(렌더 타이밍)
   */
  useLayoutEffect(() => {
    const sessionKey =
      highlightMessageId && chatRoomId ? `${chatRoomId}:${highlightMessageId}` : null;
    if (!sessionKey || !highlightMessageId) {
      setActiveHighlightId(null);
      highlightSessionRef.current = { key: null, handled: false };
      return;
    }

    const sess = highlightSessionRef.current;
    if (sess.key !== sessionKey) {
      highlightSessionRef.current = { key: sessionKey, handled: false };
    } else if (highlightSessionRef.current.handled) {
      return;
    }

    if (messages.length === 0) {
      return;
    }

    const id = highlightMessageId;

    if (highlightTargetIndex === -1) {
      const t = window.setTimeout(() => {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (next.get("messageId") === id) next.delete("messageId");
            return next;
          },
          { replace: true }
        );
      }, 4000);
      return () => window.clearTimeout(t);
    }

    let cancelled = false;
    let frames = 0;
    const maxFrames = 12;

    const applyHighlightAfterPaint = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled || highlightSessionRef.current.key !== sessionKey) return;
          setActiveHighlightId(id);
        });
      });
    };

    const tick = () => {
      if (cancelled) return;
      if (highlightSessionRef.current.key !== sessionKey) return;
      if (highlightSessionRef.current.handled) return;

      let ok = false;
      if (useVirtuosoMessageList) {
        ok = tradeVirtualizedRef.current?.scrollToMessageId(id) ?? false;
      } else {
        const root = listRef.current;
        if (root && typeof CSS !== "undefined" && typeof CSS.escape === "function") {
          const el = root.querySelector(
            `[data-message-id="${CSS.escape(id)}"]`
          ) as HTMLElement | null;
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            ok = true;
          }
        }
      }

      if (ok) {
        highlightSessionRef.current = { key: sessionKey, handled: true };
        applyHighlightAfterPaint();
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
  }, [
    highlightMessageId,
    highlightTargetIndex,
    messages.length,
    chatRoomId,
    useVirtuosoMessageList,
  ]);

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

  // 🔥 권한 체크 + 읽음 처리 (무한루프 방지: participants 문자열만 의존성으로)
  const roomParticipants = room?.participants || room?.members || [];
  const participantsKey = roomParticipants.join(",");
  const lastCheckedKeyRef = useRef<string>("");
  
  useEffect(() => {
    if (!room || !myUid) {
      // 🔥 디버깅: room이나 myUid가 없을 때 로그
      if (!room) {
        console.log("⏳ [ChatPage] 채팅방 정보 로딩 중...", { chatRoomId, myUid });
      }
      lastCheckedKeyRef.current = "";
      return;
    }
    
    // 🔥 이미 체크했고 participants가 변경되지 않았으면 스킵
    const currentParticipants = (room as any).members || room.participants || [];
    const currentKey = currentParticipants.join(",");
    
    if (lastCheckedKeyRef.current === currentKey) {
      return; // 이미 체크했고 변경 없음
    }
    
    // 🔥 members 배열 확인 (실전급 설계 우선, 하위 호환)
    const members = currentParticipants;
    const isMember = members.includes(myUid);
    
    // 🔥 디버깅: members 확인
    console.log("🔍 [ChatPage] 참여자 확인:", {
      myUid,
      members,
      participants: room.participants,
      isMember,
    });
    
    if (!isMember) {
      console.error("❌ [ChatPage] 참여자가 아닙니다:", {
        myUid,
        members,
        participants: room.participants,
        chatRoomId,
        roomData: room,
      });
      if (chatRoomId?.startsWith("match_")) {
        const mid = chatRoomId.slice("match_".length);
        toast.error("채팅 참여 정보가 아직 반영되지 않았습니다. 매칭 상세에서 다시 열어 주세요.");
        navigate(mid ? `/match/${mid}` : "/match");
        return;
      }
      alert("이 채팅방에 접근할 권한이 없습니다.");
      navigate("/app/market");
      return;
    }
    
    console.log("✅ [ChatPage] 참여자 확인 완료, 채팅방 접근 허용");
    lastCheckedKeyRef.current = currentKey;
    
    // 🔥 읽음 처리는 useChatRead 훅에서 스크롤 기반으로 처리
  }, [participantsKey, myUid, navigate, chatRoomId]); // participants 문자열만 의존성으로

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage(text);
    }
  }

  // 🎤 STT 핸들러 (실제 연결 완료)
  const handleSTTStart = async () => {
    console.log("🎤 [ChatPage] STT 버튼 클릭됨, 현재 상태:", { isListening, canUseSTT: getCanUseSTTValue(), isIOS: getIsIOS(), isPWA: getIsPWA() });

    // 📊 이벤트 로그: STT 클릭
    const meta = {
      page: "chat",
      chatRoomId: chatRoomId || null,
      platform: getIsIOS() ? "ios" : "android",
      isPWA: getIsPWA(),
      canUseSTT: getCanUseSTTValue(),
    };
    const { trackSTT } = await import("@/lib/eventLog");
    await trackSTT.click(meta);

    // 🔥 재생 중이면 중지
    if (isListening) {
      console.log("🎤 [ChatPage] STT 중지");
      stopSTT();
      return;
    }

    // 🔥 iOS Safari에서 PWA가 아니면 안내 표시
    if (getIsIOS() && !getIsPWA()) {
      const { trackSTT } = await import("@/lib/eventLog");
      await trackSTT.blocked("ios_safari_not_pwa", meta);
      setShowSTTGuide(true);
      return;
    }

    // 🔥 브라우저 지원 여부 확인
    if (!isSTTSupported) {
      console.warn("🎤 [ChatPage] STT 미지원 브라우저");
      const { trackSTT } = await import("@/lib/eventLog");
      await trackSTT.blocked("browser_not_supported", meta);
      alert("이 브라우저는 음성 입력을 지원하지 않습니다.\nChrome 또는 Chrome 기반 브라우저를 사용해주세요.");
      return;
    }

    console.log("🎤 [ChatPage] STT 지원 확인됨, 마이크 권한 체크 시작");

    // 🔥 마이크 권한 사전 체크 (모바일 안정화)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // 즉시 해제
      console.log("✅ [ChatPage] 마이크 권한 확인 완료");
    } catch (error: any) {
      console.warn("🎤 [ChatPage] 마이크 권한 오류:", error);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        alert("마이크 권한이 필요합니다.\n브라우저 설정에서 마이크 권한을 허용해주세요.");
      } else if (error.name === "NotFoundError") {
        alert("마이크를 찾을 수 없습니다.\n마이크가 연결되어 있는지 확인해주세요.");
      } else {
        alert("마이크 접근에 실패했습니다.\n다시 시도해주세요.");
      }
      return;
    }

    console.log("🎤 [ChatPage] STT 시작 시도");

    // 🔥 STT 시작 (즉시 전송 모드 - 카톡 보이스 입력 감성)
    startSTT((recognizedText) => {
      console.log("🎤 [ChatPage] STT 인식 결과:", recognizedText);
      if (recognizedText.trim()) {
        // 🔥 즉시 전송 (입력창에 넣지 않고 바로 전송)
        sendVoiceMessage(recognizedText.trim());
      } else {
        console.log("⚠️ [ChatPage] 인식된 텍스트가 비어있음");
      }
    });
  };

  // 🔊 TTS 요약 핸들러 (UX 고도화 버전)
  const handleSummaryTTS = async () => {
    console.log("🔊 [ChatPage] TTS 요약 버튼 클릭");
    
    // 🔥 중복 클릭 방지: 이미 진행 중이면 무시
    if (isSummarizing) {
      console.log("🔊 [ChatPage] 이미 요약 생성 중, 중복 클릭 무시");
      return;
    }
    
    if (messages.length === 0) {
      alert("요약할 메시지가 없습니다.");
      return;
    }

    // 🔥 브라우저 TTS 지원 확인
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("이 브라우저는 음성 재생을 지원하지 않습니다.");
      return;
    }

    // 📊 이벤트 로그: TTS 재생
    const meta = {
      page: "chat",
      chatRoomId: chatRoomId || null,
      messageCount: messages.length,
    };
    
    try {
      const { trackTTS } = await import("@/lib/eventLog");
      await trackTTS.play(meta);
    } catch (error) {
      console.warn("⚠️ [ChatPage] TTS 이벤트 로그 실패:", error);
    }

    // 🔥 요약 생성 시작 (UI 즉시 업데이트)
    setIsSummarizing(true);
    console.log("🔊 [ChatPage] 요약 생성 시작...");

    try {
      // AI 요약 생성 (AI API 또는 Fallback)
      const summaryText = await getChatSummary({
        messages,
        myUid,
        maxMessages: 10,
      });

      console.log("🔊 [ChatPage] 요약 생성 완료:", summaryText.substring(0, 50));

      if (!summaryText || summaryText.trim().length === 0) {
        console.warn("⚠️ [ChatPage] 요약 텍스트가 비어있음");
        alert("요약할 내용이 없습니다.");
        setIsSummarizing(false);
        return;
      }

      // TTS 재생
      console.log("🔊 [ChatPage] TTS 재생 시작...");
      await playTTS(summaryText);
      console.log("✅ [ChatPage] TTS 재생 완료");
      setIsSummarizing(false);
    } catch (error) {
      console.error("❌ [ChatPage] TTS 요약 실패:", error);
      try {
        const { trackTTS } = await import("@/lib/eventLog");
        await trackTTS.error("summary_failed", meta);
      } catch (logError) {
        console.warn("⚠️ [ChatPage] 에러 로그 실패:", logError);
      }
      alert("요약 재생에 실패했습니다. 다시 시도해주세요.");
      setIsSummarizing(false);
    }
  };

  // 🔥 TTS 중지 핸들러 (별도 함수로 분리)
  const handleStopTTS = () => {
    console.log("🔊 [ChatPage] TTS 중지 요청");
    stopTTS();
    setIsSummarizing(false);
  };

  // 🤖 추천 문장 클릭 핸들러 (탭) - 입력창에 삽입만 (자동 전송 ❌)
  const handleSuggestionClick = async (suggestionText: string) => {
    const meta = { page: "chat", chatRoomId: chatRoomId || null };
    const { trackSuggestion } = await import("@/lib/eventLog");
    await trackSuggestion.click(suggestionText, meta);
    handleSuggestionSelect(suggestionText);
  };

  // 🤖 추천 문장 롱프레스 핸들러 (TTS 읽고 전송)
  const handleSuggestionLongPress = async (suggestionText: string) => {
    try {
      // TTS로 읽기
      await playTTS(suggestionText);
      // 읽은 후 전송
      await sendQuickMessage(suggestionText);
    } catch (error) {
      console.warn("🔊 [ChatPage] TTS 재생 실패, 바로 전송:", error);
      // TTS 실패해도 전송
      await sendQuickMessage(suggestionText);
    }
  };

  // 🔥 위치 공유 함수
  async function shareLocation() {
    if (!chatRoomId || !myUid || !room) return;
    
    // 🔥 중복 실행 방지 (무한 루프 방지)
    if (shareLocationRef.current) {
      console.warn("⚠️ [ChatPage] 위치 공유가 이미 진행 중입니다. 중복 호출 무시");
      return;
    }
    shareLocationRef.current = true;

    // 🔥 타입 분기: 중고거래는 otherUid 계산, 모집 단체방은 members 전체
    let targetUids: string[] = [];
    if (isTrade) {
      // 🔥 중고거래: 1:1 전제
      const currentOtherUid = room.buyerId === myUid ? room.sellerId : room.buyerId;
      if (!currentOtherUid) {
        shareLocationRef.current = false;
        return;
      }
      targetUids = [currentOtherUid];
    } else if (isRecruitGroup || isMatch) {
      const members = room.members || room.participants || [];
      targetUids = members.filter((uid: string) => uid !== myUid);
      if (targetUids.length === 0) {
        shareLocationRef.current = false;
        return;
      }
    } else {
      shareLocationRef.current = false;
      return; // 알 수 없는 타입
    }

    try {
      // 현재 위치 가져오기
      const location = await getUserLocation();
      
      // 🔥 통합 메시지 전송 함수 사용 (seq 기반 unread 관리)
      const { sendMessageCommon } = await import("@/lib/chat/sendMessageCommon");
      const messageId = await sendMessageCommon({
        roomId: chatRoomId,
        uid: myUid,
        text: "위치를 공유했습니다",
        type: "location",
        location: {
          lat: Number(location.lat), // 🔥 명시적 숫자 변환
          lng: Number(location.lng), // 🔥 명시적 숫자 변환
        },
      });

      // 🔥 위치 공유 알림 생성 (타입 분기: 중고거래는 1명, 모집 단체방은 여러 명) + 스팸 방지
      if (messageId) {
        try {
          const { createNoti } = await import("@/lib/notifications/service");
          const senderName = user?.displayName || user?.email?.split("@")[0] || "누군가";
          
          await Promise.all(
            targetUids.map((uid) =>
              createNoti({
                userId: uid,
                type: "CHAT_LOCATION_SHARED",
                title: "위치 공유",
                body: `${senderName}님이 위치를 공유했습니다`,
                target: {
                  screen: 'chat',
                  id: chatRoomId,
                },
                priority: 'high',
                payload: {
                  chatRoomId,
                  senderId: myUid,
                  location: {
                    lat: location.lat,
                    lng: location.lng,
                  },
                },
              })
            )
          );
        } catch (notifError) {
          console.warn("⚠️ [ChatPage] 위치 공유 알림 생성 실패 (무시):", notifError);
        }
      }
    } catch (error) {
      console.error("❌ [ChatPage] 위치 공유 실패:", error);
      alert("위치 공유에 실패했습니다.");
    } finally {
      // 🔥 중복 실행 방지 해제
      shareLocationRef.current = false;
    }
  }

  // 🔥 Early return: 필수 데이터가 없으면 로딩 표시 (모든 hooks 호출 후)
  if (!chatRoomId || !myUid) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  return (
    <>
      {/* 🔥 STT 인식 중 애니메이션 스타일 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {/* 🔥 카톡식: 메시지 영역만 스크롤, 안내·입력은 하단 고정 (부모 MainLayout이 h-dvh + overflow-hidden) */}
      <div className="chat-page-layout relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#fafafa] pt-0">
        <div
          className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col bg-white px-4 pt-1 shadow-[0_0_0_1px_rgba(0,0,0,0.05)] sm:px-6 lg:px-8"
          style={{ boxSizing: "border-box" }}
        >
      {/* ✅ 상단: 헤더 (타입 분기) */}
      <div className="relative shrink-0">
        {/* 🔥 상단 고정 공지 (팀 채팅만) */}
        {isTeam && room?.teamId && (
          <PinnedNoticeHeader teamId={room.teamId} />
        )}
        
        {isTeam ? (
          // 🔥 팀 채팅 헤더
          <TeamChatHeader roomId={chatRoomId} room={room || {}} />
        ) : isMatch ? (
          <MatchChatHeader chatRoomId={chatRoomId} room={room} />
        ) : isRecruitGroup ? (
          // 🔥 모집 단체방 헤더
          <>
            <RecruitGroupChatHeader roomId={chatRoomId} room={(room || {}) as any} />
            {/* 🔥 Host 관리 패널 (host만 표시) */}
            {room && <HostPanel roomId={chatRoomId} room={room as any} myUid={myUid} />}
          </>
        ) : (
          <TradeChatHeader
            product={
              product && room?.productId
                ? {
                    id: room.productId,
                    title: product.title || product.name || "상품",
                    price: product.price,
                    images: product.images || (product.imageUrl ? [product.imageUrl] : undefined),
                  }
                : null
            }
            productMissing={productMissing}
            productStatus={productStatus}
            isSeller={!isBuyer}
            onReserve={reserveProduct}
            onCancelReserve={cancelReservation}
            isReserving={isReserving}
          />
        )}
        
        {/* 🔊 TTS 요약 버튼 (채팅 상단 헤더 우측) - UX 고도화 */}
        {messages.length > 0 && (
          <TTSSummaryButton
            isSummarizing={isSummarizing}
            onToggle={isSummarizing ? handleStopTTS : handleSummaryTTS}
          />
        )}
      </div>

      {/* ✅ 메시지 영역만 세로 스크롤 (flex-1 + min-h-0 필수) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* ✅ 메시지 리스트 - Trade: VirtualizedMessageList / 그 외 단체·팀·매칭: MessageListContainer */}
      {isRecruitGroup || isTeam || isMatch ? (
        <MessageListContainer
          listRef={listRef}
          bottomRef={bottomRef}
          onScroll={onScroll}
          isEmpty={messages.length === 0}
          isAtBottom={isAtBottom}
          onScrollToBottom={scrollToBottom}
          emptyComponent={<EmptyMessageList />}
          scrollBottomInsetPx={scrollBottomInsetPx}
        >
          <RecruitGroupMessageRenderer
            messages={messages as any}
            roomId={chatRoomId || ""}
            room={room as any}
            myUid={myUid}
            highlightedMessageId={activeHighlightId}
          />
        </MessageListContainer>
      ) : (
        <VirtualizedMessageList
          ref={tradeVirtualizedRef}
          messages={messages as any}
          myUid={myUid}
          mediaViewer={mediaViewer}
          isLoadingOlder={isLoadingOlder}
          hasMore={hasMore ?? false}
          onLoadOlder={loadOlderMessages}
          listRef={listRef}
          bottomRef={bottomRef}
          onScroll={onScroll}
          isAtBottom={isAtBottom}
          onScrollToBottom={scrollToBottom}
          emptyComponent={<EmptyMessageList />}
          highlightedMessageId={activeHighlightId}
          scrollBottomInsetPx={scrollBottomInsetPx}
        />
      )}
      </div>

      <STTGuideBottomSheet isOpen={!!showSTTGuide} onClose={() => setShowSTTGuide(false)} />
        </div>

      {/* ✅ 탭(h-16) 바로 위에 붙는 고정 입력대 — main pb-16 과 중복 여백 제거 */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom,0px)]">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          {suggestions.length > 0 && text.length === 0 && (
            <SuggestionBar
              suggestions={suggestions}
              isLoading={isLoadingSuggestions}
              isSTTSupported={isSTTSupported}
              isListening={isListening}
              onSuggestionClick={handleSuggestionClick}
              onSuggestionLongPress={handleSuggestionLongPress}
              onSTTStart={handleSTTStart}
            />
          )}

          <TradeClosedNotice visible={isTrade && !!productMissing} />

          {isMatch ? (
            <div
              className="border-b border-gray-100 bg-gray-50 px-3 py-1 text-center text-[11px] leading-snug text-gray-600 sm:text-xs"
              role="note"
            >
              💬 일정 제안·장소 조율은 메시지로 남기면 나중에 확인하기 좋아요.
            </div>
          ) : null}

          <ChatInputBar
            text={text}
            onTextChange={handleTextChange}
            onSend={() => sendTextMessage(text)}
            onImageSelect={handleImageSelect}
            onLocationShare={shareLocation}
            isUploadingImages={isUploadingImages}
            isRecruitGroup={isRecruitGroup}
            isRoomClosed={room?.status === "closed"}
            productMissing={isTrade ? productMissing : false}
            hasMessages={messages.length > 0}
            docked
          />

          <PWAInstallBanner visible={getIsIOS() && !getIsPWA()} />
        </div>
      </div>
      </div>

      {/* 🔥 미디어 뷰어 */}
      <MediaViewer {...mediaViewer} />
    </>
  );
}
