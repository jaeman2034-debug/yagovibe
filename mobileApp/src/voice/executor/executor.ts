/**
 * ⚙️ Executor
 * 실행 전용 (멍청해야 안전)
 * 판단 금지, 단순 실행만
 */

import type { AgentAction } from '../types';
import type { MemoryItem } from '../types';
import { openGoogleMaps, openGoogleMapsNavigate, ultimateFallback } from '../services/mapService';
import { callExecuteIntent } from '../services/executeIntentService';

export interface ExecuteContext {
  action: AgentAction;
  query: string;
  filters: {
    openNow: boolean;
    parking: boolean;
    sort: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
  };
  finalText: string;
  recentMemory: MemoryItem[];
}

/**
 * Action 실행 (판단 없이 실행만)
 */
export async function execute(
  context: ExecuteContext
): Promise<{ memoryUpdate?: Partial<MemoryItem> }> {
  const { action, query, filters, finalText, recentMemory } = context;

  switch (action) {
    case 'REPEAT_LAST': {
      // 아까 그거 / 방금 그거 / 다시
      const last = recentMemory[0];
      if (last?.result?.destination) {
        openGoogleMapsNavigate(
          last.result.destination,
          last.intent.query || last.result.destination
        );

        return {
          memoryUpdate: {
            timestamp: Date.now(),
          },
        };
      } else {
        // 🛡️ 메모리에 결과 없으면 기본 검색
        if (last?.intent?.query) {
          openGoogleMaps(last.intent.query);
        } else {
          ultimateFallback(finalText);
        }
      }
      return {};
    }

    case 'SEARCH_ALTERNATIVE': {
      // 방금 찾은 데 말고 다른 데
      const last = recentMemory[0];
      if (last?.result?.candidates && last.result.candidates.length > 1) {
        const chosenIndex = last.result.chosenIndex ?? 0;
        const otherCandidates = last.result.candidates.filter(
          (_, i) => i !== chosenIndex
        );

        if (otherCandidates.length > 0) {
          openGoogleMapsNavigate(otherCandidates[0]);

          return {
            memoryUpdate: {
              result: {
                ...last.result,
                destination: otherCandidates[0],
                chosenIndex: chosenIndex === 0 ? 1 : chosenIndex - 1,
              },
              timestamp: Date.now(),
            },
          };
        }
      }

      // 🛡️ Fallback: 기본 검색
      openGoogleMaps(query || finalText, filters);
      return {};
    }

    case 'NAVIGATE': {
      // 바로 길안내
      openGoogleMapsNavigate(query, query);

      return {
        memoryUpdate: {
          result: { destination: query },
        },
      };
    }

    case 'SEARCH':
    default: {
      // 검색 + 자동 길안내
      try {
        const result = await callExecuteIntent(
          {
            type: 'MAP_SEARCH',
            query: query || finalText,
            filters,
            autoNavigate: true,
            confidence: 1.0,
          },
          finalText
        );

        if (result.action === 'NAVIGATE' && result.destination) {
          openGoogleMapsNavigate(result.destination, query || finalText);

          return {
            memoryUpdate: {
              result: {
                destination: result.destination,
                candidates: result.place ? [result.destination!] : undefined,
                chosenIndex: result.place ? 0 : undefined,
              },
            },
          };
        } else if (result.action === 'OPEN_SEARCH' && result.query) {
          openGoogleMaps(result.query, result.filters);
        } else {
          openGoogleMaps(query || finalText, filters);
        }
      } catch (executeError: any) {
        console.error('❌ Execute Intent 실패, 기본 검색 실행:', executeError);
        openGoogleMaps(query || finalText, filters);
      }

      return {};
    }
  }
}
