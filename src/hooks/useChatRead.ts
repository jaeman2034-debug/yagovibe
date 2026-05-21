/**
 * 🔥 채팅 읽음 처리 완전판 (스크롤 + 포커스 + 가시성 기반)
 * 
 * 역할:
 * - 스크롤 하단 도달 시 읽음 처리
 * - 창 포커스 시 읽음 처리 (백그라운드에서 돌아올 때)
 * - 페이지 가시성 변경 시 읽음 처리 (탭 전환)
 * - 새 메시지 올 때 자동 읽음 (하단에 있을 때만)
 * - 성능 최적화 (debounce + 중복 방지)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { markRoomRead } from "@/lib/chat/markRoomRead";

export interface UseChatReadParams {
  roomId: string;
  me: string;
  messages: any[];
}

export function useChatRead(params: UseChatReadParams) {
  const { roomId, me, messages } = params;

  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadSeqRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  // 🔥 읽음 처리 함수 (조건부 + 중복 방지 + debounce)
  const handleMarkRead = useCallback(() => {
    if (!roomId || !me || messages.length === 0) return;
    if (isProcessingRef.current) return; // 이미 처리 중이면 스킵

    // 🔥 조건 1: 페이지가 visible 상태일 때만
    if (document.visibilityState !== 'visible') {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const lastSeq = lastMessage?.seq || 0;
    
    // 🔥 이미 읽은 메시지면 스킵
    if (lastSeq <= lastReadSeqRef.current) {
      return;
    }

    // 🔥 debounce: 연속 호출 방지 (700ms)
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      isProcessingRef.current = true;
      markRoomRead(roomId, me)
        .then(() => {
          lastReadSeqRef.current = lastSeq;
        })
        .catch((err) => {
          // 🔥 읽음 처리 실패는 조용히 무시
        })
        .finally(() => {
          isProcessingRef.current = false;
        });
    }, 700); // 700ms debounce (500~1000ms 범위)
  }, [roomId, me, messages]);

  // 🔥 스크롤 감지 (120px 이내면 하단으로 간주) - flex 구조 대응
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    // 🔥 flex 구조에서도 정확한 스크롤 계산
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    const diff = scrollHeight - scrollTop - clientHeight;
    const atBottom = diff < 120; // 120px 이내면 하단으로 간주 (카톡급 UX)
    setIsAtBottom(atBottom);

    // 🔥 하단 근처에 있고 visible 상태일 때만 읽음 처리
    if (atBottom && document.visibilityState === 'visible') {
      handleMarkRead();
    }
  }, [handleMarkRead]);

  // 🔥 메시지 변경 시 읽음 처리 (하단에 있을 때만)
  useEffect(() => {
    if (!isAtBottom || messages.length === 0) return;
    handleMarkRead();
  }, [messages.length, isAtBottom, handleMarkRead]);

  // 🔥 창 포커스 시 읽음 처리 (백그라운드에서 돌아올 때)
  useEffect(() => {
    const handleFocus = () => {
      if (isAtBottom) {
        handleMarkRead();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAtBottom, handleMarkRead]);

  // 🔥 페이지 가시성 변경 시 읽음 처리 (탭 전환)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // 🔥 탭이 보일 때만 읽음 처리 (백그라운드에서는 안 함)
      if (document.visibilityState === 'visible' && isAtBottom) {
        handleMarkRead();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAtBottom, handleMarkRead]);

  // 🔥 자동 스크롤 (하단에 있을 때만)
  useEffect(() => {
    if (!isAtBottom) return;

    // 약간의 딜레이를 주어 DOM 업데이트 후 스크롤
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages.length, isAtBottom]);

  // 🔥 하단으로 스크롤 이동 함수
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
    // 🔥 스크롤 하단 도달 시 즉시 읽음 처리
    handleMarkRead();
  }, [handleMarkRead]);

  // 🔥 cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    bottomRef,
    onScroll,
    isAtBottom,
    scrollToBottom,
  };
}
