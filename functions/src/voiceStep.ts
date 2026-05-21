/**
 * 🚀 Voice Step HTTP Endpoint
 * Agent + Search/Select + Recovery 한 방
 * 모바일은 "결과대로 실행"만 함
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { runAgent, type AgentResult } from './agent/runAgent';
import { parseLastDestination, composeQuery, looksLikeRepeat } from './voiceStep.utils';
import {
  searchAndNavigate,
  searchAndNavigateExtended,
  type ServerInstruction,
} from './executor/searchAndNavigate';
import { withTimeout, DEFAULT_TIMEOUT_MS } from './utils/timeout';
import { logVoiceStep, logError } from './utils/logger';
import { validateApiKeys } from './config/security';
import { SERVER_TIMEOUT_MS } from './config/cost';
import { inferIntensityKorean } from './voiceStep.utils.intensity';
import { buildFollowups, type Followup } from './voiceStep.utils.followups';
import {
  buildSummary,
  buildSimpleSummary,
} from './voiceStep.utils.summary';

// Server Instruction 타입 (export)
export type { ServerInstruction };

// Step Response 타입 (확장)
export interface StepResponse {
  instruction: ServerInstruction;
  summary?: {
    text: string;
    tts: string;
  };
  followups?: Followup[];
  decision?: {
    intent: string;
    intensity: 'SHOW' | 'SUGGEST' | 'AUTO';
    autoNavigate: boolean;
    reason: string;
  };
  context?: {
    lastQuery: string;
    lastAction: string;
  };
  places?: Array<{ // 🔥 Places 검색 결과 포함
    name: string;
    address: string;
    rating: number;
    openNow: boolean | null;
    lat: number;
    lng: number;
    placeId?: string | null;
  }>;
  debug?: {
    finalText: string;
    action: string;
    fallback?: string;
    latencyMs?: number;
  };
}

/**
 * Voice Step 엔드포인트
 */
export const voiceStep = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
    maxInstances: 10,
    secrets: ['OPENAI_API_KEY', 'GMAPS_API_KEY'],
  } as any,
  async (req, res) => {
    const t0 = Date.now();

    // CORS 헤더 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // API 키 검증
    try {
      validateApiKeys();
    } catch (error: any) {
      logError(error, { context: 'API key validation' });
      // 키 검증 실패해도 실행 (Places 없이)
    }

    // Session ID 생성
    const sessionId = String(req.headers['x-session-id'] || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    try {
      const finalText = String(req.body?.finalText ?? '').trim();
      const memory = String(req.body?.memory ?? '').trim();

      if (!finalText) {
        res.json({ instruction: { kind: 'NOOP' } });
        return;
      }

      logger.info('🚀 Voice Step 요청:', finalText);

      // 0. 강제 보정: 반복 지시어 + 메모리 있으면 REPEAT_LAST로 강제 (Agent 실행 전, FIX 3)
      // 이렇게 하면 Agent 타임아웃/에러와 무관하게 즉시 처리
      const lastDestination = parseLastDestination(memory);
      if (lastDestination && looksLikeRepeat(finalText)) {
        logger.info('🔧 반복 지시어 감지, REPEAT_LAST로 강제 보정 (Agent 우회)');
        res.json({
          instruction: { kind: 'OPEN_NAVIGATE', destination: lastDestination },
          debug: {
            finalText,
            action: 'REPEAT_LAST_FORCED',
            fallback: undefined,
            latencyMs: Date.now() - t0,
          },
        });
        return;
      }

      // 1. Agent 실행 (LLM 1회) + 타임아웃
      let agent: AgentResult;
      let llmLatencyMs = 0;

      try {
        const agentStartTime = Date.now();
        agent = await withTimeout(
          runAgent({
            userText: finalText,
            memorySummary: memory,
            memoryCount: memory ? memory.split('\n').length : 0,
          }),
          DEFAULT_TIMEOUT_MS,
          'Agent timeout'
        );
        llmLatencyMs = Date.now() - agentStartTime;
      } catch (error: any) {
        llmLatencyMs = Date.now() - t0;
        logError(error, { sessionId, finalText, context: 'Agent execution' });

        // Agent 실패 시 SEARCH fallback
        const totalLatencyMs = Date.now() - t0;
        logVoiceStep({
          ts: Date.now(),
          sessionId,
          finalText,
          agentAction: 'AGENT_ERROR',
          fallback: 'agent_timeout_or_error',
          llmLatencyMs,
          totalLatencyMs,
          success: false,
          error: error?.message,
        });

        const intensity = inferIntensityKorean(finalText);
        const summary = buildSimpleSummary(finalText, 'OPEN_SEARCH');
        res.json({
          instruction: { kind: 'OPEN_SEARCH', query: finalText },
          summary,
          followups: buildFollowups('SEARCH', false),
          decision: {
            intent: 'SEARCH',
            intensity,
            autoNavigate: false,
            reason: 'Agent 오류로 기본 검색을 실행합니다.',
          },
          context: {
            lastQuery: finalText,
            lastAction: 'OPEN_SEARCH',
          },
          debug: {
            finalText,
            action: 'AGENT_ERROR',
            fallback: 'agent_timeout_or_error',
            latencyMs: totalLatencyMs,
          },
        });
        return;
      }

      logger.info('✅ Agent 결정:', agent.action, agent.query);

      // 3. Deterministic Recovery Layer
      let instruction: ServerInstruction = { kind: 'NOOP' };
      let fallback: string | undefined;
      
      // Places 결과 저장 (summary/followups용)
      let placesResult: any[] | undefined;
      let bestPlaceResult: any | undefined;

      if (agent.action === 'REPEAT_LAST') {
        // 아까 그거 / 방금 그거 / 다시
        const last = parseLastDestination(memory);
        if (last) {
          instruction = { kind: 'OPEN_NAVIGATE', destination: last };
          // REPEAT_LAST는 Places 검색 없이 바로 네비
        } else {
          // 메모리 없음 → SEARCH로 Fallback
          instruction = { kind: 'OPEN_SEARCH', query: finalText };
          fallback = 'repeat_last_no_memory';
        }
      } else if (agent.action === 'SEARCH_ALTERNATIVE') {
        // 방금 찾은 데 말고 다른 데
        // MVP: 같은 검색어로 다시 검색 (Places 검색 시도)
        const query = composeQuery(agent.query || finalText, agent.filters);
        const placesStartTime = Date.now();
        try {
          const result = await withTimeout(
            searchAndNavigateExtended(query, false),
            SERVER_TIMEOUT_MS - llmLatencyMs,
            'Places timeout'
          );
          if (result.instruction.kind === 'OPEN_NAVIGATE') {
            instruction = result.instruction;
            placesResult = result.places || [];
            bestPlaceResult = result.bestPlace;
          } else {
            instruction = { kind: 'OPEN_SEARCH', query };
            placesResult = result.places || [];
          }
        } catch (error: any) {
          instruction = { kind: 'OPEN_SEARCH', query };
          fallback = 'alt_mvp_search_again';
        }
      } else if (agent.action === 'NAVIGATE') {
        // 자동 네비: Places 검색 → 최적 선택 → NAVIGATE
        const query = composeQuery(agent.query || finalText, agent.filters);
        const placesStartTime = Date.now();

        try {
          const result = await withTimeout(
            searchAndNavigate(query, true), // isNavigate = true
            SERVER_TIMEOUT_MS - llmLatencyMs, // 남은 시간만 사용
            'Places timeout'
          );

          const placesLatencyMs = Date.now() - placesStartTime;

          if (result.kind === 'OPEN_NAVIGATE') {
            instruction = result;
          } else {
            // 검색 결과 없음 → SEARCH fallback
            instruction = { kind: 'OPEN_SEARCH', query };
            fallback = 'navigate_no_results';
          }
        } catch (error: any) {
          const placesLatencyMs = Date.now() - placesStartTime;
          logError(error, { sessionId, finalText, context: 'Search and Navigate' });
          
          // Fallback: 기본 검색
          const query = composeQuery(agent.query || finalText, agent.filters);
          instruction = { kind: 'OPEN_SEARCH', query };
          fallback = error?.message?.includes('timeout') ? 'places_timeout' : 'navigate_error';
        }
      } else if (agent.action === 'SEARCH') {
        // 검색 (NAVIGATE로 자동 전환 시도)
        let query = composeQuery(agent.query || finalText, agent.filters);

        // 쿼리가 너무 짧으면 원문 사용
        if (query.length < 2) {
          query = finalText;
        }

        // SEARCH도 Places로 최적 선택 시도 (조용히)
        const placesStartTime = Date.now();
        try {
          const result = await withTimeout(
            searchAndNavigateExtended(query, false), // isNavigate = false, 확장 버전
            SERVER_TIMEOUT_MS - llmLatencyMs, // 남은 시간만 사용
            'Places timeout'
          );

          if (result.instruction.kind === 'OPEN_NAVIGATE') {
            // 결과 있으면 자동으로 NAVIGATE
            instruction = result.instruction;
            fallback = 'search_auto_navigate';
            // Places 정보 저장
            placesResult = result.places || [];
            bestPlaceResult = result.bestPlace;
          } else {
            // 결과 없으면 SEARCH
            instruction = { kind: 'OPEN_SEARCH', query };
            // Places 정보 저장 (summary/followups용)
            placesResult = result.places || [];
          }
        } catch (error: any) {
          // Places 실패해도 조용히 SEARCH로
          logger.warn('⚠️ SEARCH → NAVIGATE 전환 실패, 기본 검색 사용:', error);
          instruction = { kind: 'OPEN_SEARCH', query };
          fallback = error?.message?.includes('timeout') ? 'places_timeout' : 'search_fallback';
        }
      } else {
        // NONE → 항상 뭔가 실행
        instruction = { kind: 'OPEN_SEARCH', query: finalText };
        fallback = 'none_to_search';
      }

      const totalLatencyMs = Date.now() - t0;
      
      // Places latency 계산 (NAVIGATE 또는 SEARCH → NAVIGATE 경우만)
      let placesLatencyMs: number | undefined;
      if (instruction.kind === 'OPEN_NAVIGATE') {
        placesLatencyMs = totalLatencyMs - llmLatencyMs;
      }

      // 🎯 Intensity 계산 (동사 기반)
      const intensity = inferIntensityKorean(finalText);

      // 📝 Summary 생성
      let summary: { text: string; tts: string } | null = null;
      if (placesResult && placesResult.length > 0) {
        summary = buildSummary(placesResult, agent.query || finalText, instruction.kind);
      } else {
        summary = buildSimpleSummary(agent.query || finalText, instruction.kind);
      }

      // 🔄 Follow-ups 생성
      const followups = buildFollowups(
        agent.action === 'NAVIGATE' ? 'NAVIGATE' : 'SEARCH',
        placesResult ? placesResult.length > 0 : false,
        bestPlaceResult !== undefined
      );

      // 🧠 Decision 정보
      const autoNavigate =
        intensity === 'AUTO' ||
        (instruction.kind === 'OPEN_NAVIGATE' && intensity === 'SUGGEST') ||
        (placesResult && placesResult.length === 1);

      const decisionReason =
        intensity === 'AUTO'
          ? `'${finalText}'에 강한 행동 의도가 있어 자동으로 안내합니다.`
          : intensity === 'SUGGEST'
            ? `'${finalText}'는 추천 의도이며, 결과가 ${placesResult?.length || 0}개입니다.`
            : `'${finalText}'는 탐색 의도이며 결과를 보여드립니다.`;

      // 로그 기록
      logVoiceStep({
        ts: Date.now(),
        sessionId,
        finalText,
        agentAction: agent.action,
        fallback,
        llmLatencyMs,
        placesLatencyMs,
        totalLatencyMs,
        success: true,
      });

      logger.info('✅ Step 응답:', instruction.kind, fallback);

      // 📦 확장된 응답 구성
      const response: StepResponse = {
        instruction,
        summary: summary || undefined,
        followups: followups.length > 0 ? followups : undefined,
        decision: {
          intent: agent.action,
          intensity,
          autoNavigate,
          reason: decisionReason,
        },
        context: {
          lastQuery: agent.query || finalText,
          lastAction: instruction.kind,
        },
        places: placesResult && placesResult.length > 0 ? placesResult.map(p => ({
          name: p.name,
          address: p.address,
          rating: p.rating,
          openNow: p.openNow,
          lat: p.lat,
          lng: p.lng,
          placeId: p.placeId || undefined,
        })) : undefined, // 🔥 Places 검색 결과 포함
        debug: {
          finalText,
          action: agent.action,
          fallback,
          latencyMs: totalLatencyMs,
        },
      };

      res.json(response);
      return;
    } catch (error: any) {
      const totalLatencyMs = Date.now() - t0;
      const errorSessionId = sessionId || 'unknown';
      const errorFinalText = String(req.body?.finalText ?? '').trim();
      
      logError(error, {
        sessionId: errorSessionId,
        finalText: errorFinalText,
        context: 'Voice Step',
      });

      // Ultimate Fallback: 항상 검색 열기 (절대 NOOP 금지)
      const finalText = String(req.body?.finalText ?? '').trim();

      logVoiceStep({
        ts: Date.now(),
        sessionId: errorSessionId,
        finalText: errorFinalText,
        agentAction: 'SERVER_ERROR',
        fallback: 'ultimate_fallback',
        totalLatencyMs,
        success: false,
        error: error?.message,
      });

      res.json({
        instruction: { kind: 'OPEN_SEARCH', query: finalText },
        debug: {
          finalText,
          action: 'SERVER_ERROR',
          fallback: String(error?.message ?? 'error'),
          latencyMs: totalLatencyMs,
        },
      });
      return;
    }
  }
);
