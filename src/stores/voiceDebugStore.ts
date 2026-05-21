/**
 * Voice Debug Store
 * 음성 Intent 디버깅을 위한 로그 저장소
 */

import { useEffect, useReducer } from "react";

export interface VoiceDebugLog {
  id: string;
  time: string;
  text: string;
  intent?: string;
  action?: string;
  error?: string;
  tts?: string;
  state?: string;
}

class VoiceDebugStore {
  private logs: VoiceDebugLog[] = [];
  private listeners: Set<() => void> = new Set();
  private maxLogs = 50; // 최대 로그 개수

  // 로그 추가
  addLog(log: Omit<VoiceDebugLog, "id" | "time">) {
    const newLog: VoiceDebugLog = {
      id: `${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString("ko-KR"),
      ...log,
    };

    this.logs.unshift(newLog); // 최신 로그가 위에

    // 최대 개수 제한
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // 리스너에게 알림
    this.notifyListeners();
  }

  // 로그 가져오기
  getLogs(): VoiceDebugLog[] {
    return this.logs;
  }

  // 로그 초기화
  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  // 리스너 등록
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 리스너에게 알림
  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }
}

// 싱글톤 인스턴스
export const voiceDebugStore = new VoiceDebugStore();

// React Hook
export function useVoiceDebugStore() {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const unsubscribe = voiceDebugStore.subscribe(() => {
      forceUpdate();
    });
    return unsubscribe;
  }, []);

  return {
    logs: voiceDebugStore.getLogs(),
    addLog: voiceDebugStore.addLog.bind(voiceDebugStore),
    clearLogs: voiceDebugStore.clearLogs.bind(voiceDebugStore),
  };
}

