# 📋 커서(Cursor) 채팅에 붙여넣기용 프롬프트

아래 전체를 복사해서 Cursor 채팅창에 붙여넣고 실행하세요.

---

```
현재 프로젝트는 React + Firebase Functions 기반이며, OpenAI 호출 구조를 프론트 → 서버로 완전히 이전하는 마이그레이션 단계입니다.

다음 작업을 순서대로 정확하게 수행하세요.

---

## 목표

- 프론트에서 OpenAI 직접 호출 제거
- 모든 AI 호출을 Firebase Functions (Callable)로 통합
- 기존 기능 유지하면서 점진적 마이그레이션

---

## 1단계: Insights 마이그레이션

파일: src/pages/admin/InsightsPage.tsx, src/pages/admin/Insights.tsx

제거: fetch("https://api.openai.com/..."), fetch("/api/generateInsight"), VITE_OPENAI_API_KEY

변경: httpsCallable(functions, "generateAI") 사용
- type: "insight"
- payload: { text, ...logData }
- 응답: res.data.result (JSON이면 parse)

---

## 2단계: Report 마이그레이션

파일: src/pages/admin/ReportsPage.tsx, src/pages/ReportsPage.tsx

제거: fetch("/api/generateWeeklyReport"), fetch("/api/summarizeReport")

변경: generateAI (type: "report") 또는 FUNCTIONS_BASE_URL 기반 HTTP 호출
- src/config/functions.ts 의 FUNCTIONS_BASE_URL 사용
- getApiBaseUrl() 사용 가능 (environment.ts)

---

## 3단계: Voice / NLU 마이그레이션

파일: VoiceMap.tsx, VoiceMapDashboard.tsx, NLUService_AI.ts, NLMService.ts, lib/openai.ts, core/ai-core.ts

제거: dangerouslyAllowBrowser, new OpenAI() in frontend, fetch("https://api.openai.com/...")

변경: generateAI Callable (type 확장 필요 시 functions/src/generateAI.ts에 nlu, voice_response 추가)

---

## 4단계: 공통 규칙

금지: VITE_OPENAI_API_KEY, openai.com, new OpenAI() in frontend
허용: httpsCallable, FUNCTIONS_BASE_URL, getApiBaseUrl

---

## 5단계: 최종 정리

1. 전역 검색: VITE_OPENAI_API_KEY, openai.com → 결과 0개 확인
2. .env.local 에서 VITE_OPENAI_API_KEY 제거
3. env.d.ts에서 해당 타입 제거
4. npm run build (프론트 + functions) 검증

---

## 유지

- generateFederationHistory 등 기존 Callable
- runAI, getOpenAIClient
- generateAI Callable 구조

결과: React → Firebase Functions → OpenAI. 프론트에 OpenAI 호출 0줄.
```
