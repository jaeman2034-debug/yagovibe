/**
 * 🔥 useAutoSave 훅
 * 
 * 역할:
 * - 자동 저장 (debounce)
 * - 데이터 손실 방지
 */

import { useEffect, useRef } from "react";

interface UseAutoSaveOptions {
  data: any;
  onSave: (data: any) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    // 데이터가 변경되지 않았으면 저장하지 않음
    if (JSON.stringify(data) === JSON.stringify(lastSavedRef.current)) {
      return;
    }

    // 기존 타이머 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 새 타이머 설정
    timeoutRef.current = setTimeout(async () => {
      try {
        await onSave(data);
        lastSavedRef.current = JSON.parse(JSON.stringify(data));
      } catch (error) {
        console.error("자동 저장 실패:", error);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, onSave, debounceMs, enabled]);

  // 컴포넌트 언마운트 시 저장
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}
