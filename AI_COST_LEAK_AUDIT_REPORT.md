# 🚨 AI 비용 누수 감사 보고서

## ⚠️ 심각한 문제 발견 (즉시 수정 필요)

### 1️⃣ 클라이언트에서 직접 OpenAI API 호출 (최우선 수정)

#### 발견된 위치:

**🔴 Critical:**
1. `src/pages/voice/VoiceMap.tsx` (381-392줄)
   - 직접 `fetch("https://api.openai.com/v1/chat/completions")` 호출
   - `import.meta.env.VITE_OPENAI_API_KEY` 사용
   - **위험도: 매우 높음** (API 키가 클라이언트 번들에 포함됨)

2. `src/pages/admin/Insights.tsx` (72-96줄)
   - 직접 OpenAI API 호출
   - `import.meta.env.VITE_OPENAI_API_KEY` 사용
   - **위험도: 매우 높음**

3. `src/api/` 디렉토리 전체
   - `generateWeeklyReport.ts`
   - `generateReport.ts`
   - `generateInsight.ts`
   - `summarizeReport.ts`
   - `slackReport.ts`
   - `voiceReport.ts`
   - 모두 클라이언트에서 실행 가능한 OpenAI 호출

4. `src/lib/openai.ts`, `src/core/ai-core.ts`
   - OpenAI 클라이언트가 클라이언트 번들에 포함
   - **API 키 노출 위험**

#### 문제점:
- ❌ API 키가 클라이언트 번들에 포함되어 노출됨
- ❌ 비용 제어 불가능
- ❌ 권한 체크 불가
- ❌ 사용량 추적 불가
- ❌ 중복 호출 방지 불가

---

### 2️⃣ generateTeamAIReport.ts 상태 머신 검증

#### 현재 상태:
- ✅ `status: "queued"`로 초기 생성
- ✅ 상태 전이: `queued` → `processing` → `done`
- ❌ **중복 실행 방지 로직 없음**
- ❌ **권한 체크 후 status 확인 없음**
- ❌ **실제 AI 호출이 없음** (템플릿 기반)

#### 문제점:
- `generateReportContent`가 호출될 때 status 체크 없음
- 여러 요청이 동시에 들어오면 중복 실행 가능
- 실제 AI API 호출이 없어서 비용은 없지만, 구조적으로 취약

---

### 3️⃣ 자동 실행 패턴 (확인 필요)

#### 발견된 위치:
1. `functions/src/autonomousActionEngine.ts`
   - 스케줄러: `every 6 hours`
   - **의도된 자동 실행인지 확인 필요**

2. `functions/src/orchestrateAIModules.ts`
   - 스케줄러: `0 8 * * 1` (매주 월요일)
   - **의도된 자동 실행인지 확인 필요**

3. `functions/src/selfLearningGovernance.ts`
   - 스케줄러: `every 24 hours`
   - **의도된 자동 실행인지 확인 필요**

#### 판단:
- 스케줄러는 서버에서 실행되므로 "자동 실행"이지만 허용 가능
- 하지만 명확한 쿼터/리밋 체크 필요

---

## ✅ 권장 수정 사항 (우선순위)

### 우선순위 1: 클라이언트 OpenAI 호출 제거

#### 1-1. VoiceMap.tsx 수정
```typescript
// ❌ 제거할 코드
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
const res = await fetch("https://api.openai.com/v1/chat/completions", {
  headers: { Authorization: `Bearer ${openaiKey}` },
  // ...
});

// ✅ 수정: Cloud Function 호출
const analyzeIntent = httpsCallable(functions, "analyzeVoiceIntent");
const result = await analyzeIntent({ text });
```

#### 1-2. Insights.tsx 수정
```typescript
// ❌ 제거할 코드
const key = import.meta.env.VITE_OPENAI_API_KEY;
const res = await fetch("https://api.openai.com/v1/chat/completions", {
  // ...
});

// ✅ 수정: Cloud Function 호출
const generateInsight = httpsCallable(functions, "generateInsight");
const result = await generateInsight({ data });
```

#### 1-3. src/api/ 디렉토리 처리
- **옵션 1**: Cloud Functions로 이동
- **옵션 2**: 삭제 (더 이상 사용하지 않는 경우)

#### 1-4. src/lib/openai.ts, src/core/ai-core.ts
- **삭제 또는 클라이언트 접근 차단**
- 서버 전용 모듈로 명시

---

### 우선순위 2: generateTeamAIReport.ts 중복 실행 방지

```typescript
// ✅ 추가 필요
async function generateReportContent(...) {
  const reportRef = db.doc(`teams/${teamId}/ai_reports/${reportId}`);
  
  // 🔥 중복 실행 방지: status 체크
  const currentReport = await reportRef.get();
  const currentData = currentReport.data();
  
  if (currentData?.status !== "queued") {
    logger.warn(`⚠️ 리포트 ${reportId}는 이미 처리 중입니다. status: ${currentData?.status}`);
    return; // 중복 실행 방지
  }
  
  // 🔥 권한 재확인
  await requireAdmin(teamId, uid);
  
  // 🔥 사용량 체크
  const usage = await getUsage(teamId);
  const check = checkUsageLimit({ plan, usage });
  if (!check.ok) {
    throw new Error(`사용량 한도 초과: ${check.reason}`);
  }
  
  // 이제 AI 호출 시작
  // ...
}
```

---

### 우선순위 3: AI 호출 전 필수 체크리스트

```typescript
// ✅ AI 호출 전 반드시 체크
async function safeAICall(teamId: string, uid: string, action: string) {
  // 1. 권한 체크
  await requireAdmin(teamId, uid);
  
  // 2. 사용량 체크
  const { plan, usage } = await getTeamPlanAndUsage(teamId);
  const limitCheck = checkUsageLimit({ plan, usage });
  if (!limitCheck.ok) {
    throw new Error(`사용량 한도 초과: ${limitCheck.reason}`);
  }
  
  // 3. 상태 체크 (중복 방지)
  const status = await getCurrentStatus(teamId, action);
  if (status !== "idle") {
    throw new Error(`이미 처리 중입니다. status: ${status}`);
  }
  
  // 4. AI 호출 (이제 안전)
  // ...
  
  // 5. 사용량 증가
  await incrementUsage(teamId, { actionsThisMonth: 1 });
  
  // 6. 로그 기록
  await writeAuditLog({
    teamId,
    action: "AI_REPORT_CREATED",
    actorUid: uid,
    // ...
  });
}
```

---

## 📊 비용 누수 위험도 매트릭스

| 위치 | 위험도 | 비용 영향 | 우선순위 |
|------|--------|----------|----------|
| `src/pages/voice/VoiceMap.tsx` | 🔴 매우 높음 | 높음 | P0 (즉시) |
| `src/pages/admin/Insights.tsx` | 🔴 매우 높음 | 높음 | P0 (즉시) |
| `src/api/*.ts` | 🔴 높음 | 중간 | P1 |
| `src/lib/openai.ts` | 🟡 중간 | 낮음 | P2 |
| `generateTeamAIReport.ts` | 🟡 중간 | 낮음 | P1 |
| 스케줄러 함수들 | 🟢 낮음 | 낮음 | P3 (모니터링) |

---

## 🎯 다음 단계

1. **즉시 조치** (P0):
   - 클라이언트 OpenAI 호출 제거
   - API 키 환경변수 제거

2. **구조 개선** (P1):
   - generateTeamAIReport에 중복 방지 로직 추가
   - 모든 AI 호출에 사용량 체크 추가

3. **모니터링** (P2):
   - AI 호출 로깅 강화
   - 비용 대시보드 구축

---

**감사 완료 날짜**: 2025-12-21
**다음 재검토**: 수정 완료 후

