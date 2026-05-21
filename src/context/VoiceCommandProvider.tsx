import { createContext, useContext, useState, ReactNode } from "react";
import type { VoiceIntent } from "@/types/voiceIntent";
import type { DateIntent } from "@/utils/parseDateIntent";

/**
 * 음성 대화 맥락(Context) 상태
 */
export interface VoiceContextState {
  /** 마지막 처리된 Intent */
  lastIntent: VoiceIntent | null;
  /** 마지막 추출된 엔티티들 */
  lastEntities: {
    player?: string | null;
    team?: string | null;
    league?: string | null;
    date?: DateIntent | null;
    sport?: string | null;
  };
}

interface VoiceCommandContextValue {
  lastVoiceCommand: string | null;
  setLastVoiceCommand: (command: string | null) => void;
  clearVoiceCommand: () => void;
  // 🔥 Context Memory 추가
  voiceContext: VoiceContextState;
  setLastIntent: (intent: VoiceIntent | null) => void;
  setLastEntities: (entities: Partial<VoiceContextState["lastEntities"]>) => void;
  clearContext: () => void;
}

const VoiceCommandContext = createContext<VoiceCommandContextValue>({
  lastVoiceCommand: null,
  setLastVoiceCommand: () => {},
  clearVoiceCommand: () => {},
  voiceContext: {
    lastIntent: null,
    lastEntities: {},
  },
  setLastIntent: () => {},
  setLastEntities: () => {},
  clearContext: () => {},
});

export const useVoiceCommand = () => useContext(VoiceCommandContext);

export function VoiceCommandProvider({ children }: { children: ReactNode }) {
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);
  const [voiceContext, setVoiceContext] = useState<VoiceContextState>({
    lastIntent: null,
    lastEntities: {},
  });

  const clearVoiceCommand = () => {
    setLastVoiceCommand(null);
  };

  const setLastIntent = (intent: VoiceIntent | null) => {
    setVoiceContext((prev) => ({
      ...prev,
      lastIntent: intent,
    }));
  };

  const setLastEntities = (entities: Partial<VoiceContextState["lastEntities"]>) => {
    setVoiceContext((prev) => ({
      ...prev,
      lastEntities: {
        ...prev.lastEntities,
        ...entities,
      },
    }));
  };

  const clearContext = () => {
    setVoiceContext({
      lastIntent: null,
      lastEntities: {},
    });
  };

  return (
    <VoiceCommandContext.Provider
      value={{
        lastVoiceCommand,
        setLastVoiceCommand,
        clearVoiceCommand,
        voiceContext,
        setLastIntent,
        setLastEntities,
        clearContext,
      }}
    >
      {children}
    </VoiceCommandContext.Provider>
  );
}

