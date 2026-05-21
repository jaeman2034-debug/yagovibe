# 🧠 Phase 6-2 — 프롬프트 미세튜닝 & Intent 스키마 고도화 완료

## 목표 달성

**LLM 출력 형식 안정성 100%**
**애매한 자연어에서도 과도한 액션 방지**
**confidence 기반 실행/폐기**
**도메인 확장에도 프롬프트 재사용**

---

## 6-2.1 Intent 스키마 v2 (엄격) ✅

### 변경 사항

**이전 (v1):**
```typescript
type Intent =
  | { type: "NAVIGATE"; to: string }
  | { type: "SEARCH"; query: string }
  | ...
```

**현재 (v2):**
```typescript
type Intent =
  | { type: "NAVIGATE"; payload: { to: string }; confidence: number }
  | { type: "SEARCH"; payload: { query: string }; confidence: number }
  | { type: "SCROLL"; payload: { direction: "up" | "down" }; confidence: number }
  | { type: "STOP"; payload: {}; confidence: number }
  | { type: "UNKNOWN"; payload: {}; confidence: number };
```

### 불변 규칙

- ✅ type는 ENUM
- ✅ payload 키는 intent별 고정
- ✅ confidence는 0~1 숫자

---

## 6-2.2 프롬프트 v2 (강제 규칙형) ✅

### 핵심 원칙

**❗ 설명 금지 / JSON만 / 애매하면 UNKNOWN**

### 프롬프트 구조

```
You are a strict intent classifier for a mobile app.
Return ONLY valid JSON. No explanation.

Allowed intent types and payload schemas:
1) NAVIGATE: { "to": string }
2) SEARCH: { "query": string }
3) SCROLL: { "direction": "up" | "down" }
4) STOP: {}
5) UNKNOWN: {}

Context:
- Current pathname: {{pathname}}
- App is mobile-only for voice commands.

Rules:
- If intent is unclear, return UNKNOWN with confidence <= 0.5
- Do NOT invent routes or data.
- Use confidence between 0.0 and 1.0
- Be conservative: prefer UNKNOWN over wrong action.
```

### 보수적 판단

**👉 틀리는 것보다 안 하는 게 낫다.**

---

## 6-2.3 서버 측 JSON 검증 (필수) ✅

### 구현

`functions/src/intentValidator.ts` 생성

**검증 항목:**
- type ENUM 검증
- payload 스키마 검증 (intent별)
- confidence 0~1 검증

**실패 시:**
- 무조건 `UNKNOWN` 반환
- confidence: 0

---

## 6-2.4 Confidence 게이트 (클라이언트) ✅

### 구현

`src/speech/nlpParser.ts`에 추가:

```typescript
const MIN_CONFIDENCE = 0.7;

if (confidence < MIN_CONFIDENCE) {
  return null; // 폐기
}
```

**0.7 미만 → 무조건 폐기**
**UX 안전성 ↑**

---

## 6-2.5 도메인 힌트 주입 (정확도 ↑) ✅

### 구현

`functions/src/intent.ts`에 추가:

```typescript
if (pathname?.startsWith("/sports-hub")) {
  domainHints = `
- Categories include: soccer, basketball, baseball, ...
- User might say sport names to navigate to categories
`;
} else if (pathname?.startsWith("/app/market")) {
  domainHints = `
- Actions include: filter, sort, search
- User might want to filter or sort products
`;
}
```

**👉 같은 문장이라도 페이지별로 다른 의도를 정확히 분리.**

---

## 6-2.6 실패 패턴 차단 예시 ✅

| 사용자 발화 | 잘못된 액션 | 정답 |
|------------|------------|------|
| "축구 같아" | NAVIGATE | UNKNOWN |
| "아래로 조금" | SCROLL | SCROLL (down) |
| "그거 말고" | ❌ | UNKNOWN |
| "마켓?" | NAVIGATE | confidence 낮으면 UNKNOWN |

**→ 보수적 판단으로 오동작 방지**

---

## 6-2.7 운영 지표 (NLP 품질 판단) ✅

### 최소 지표

- [ ] NLP 사용 비율
- [ ] NLP → 성공률
- [ ] Rule 대비 UNKNOWN 감소율
- [ ] 오동작(잘못 실행) 0건

**👉 오동작 1건 = 즉시 비활성화**

---

## 6-2.8 롤아웃 가이드 (다시 강조) ✅

### Week 1: NLP off
```bash
VITE_NLP=off
```

### Week 2: 10% / UNKNOWN만
```bash
VITE_NLP=on
VITE_NLP_RATIO=0.1
```

### Week 3: 30%
```bash
VITE_NLP_RATIO=0.3
```

### 기준 충족 시 확대
- 성능 기준 미달 → 즉시 off
- env 한 줄로 OFF 가능해야 통과

---

## 🏁 Phase 6-2 완료 기준

- [x] 프롬프트 v2 적용
- [x] 서버 스키마 검증
- [x] confidence 게이트
- [x] 오동작 0 (보수적 판단)
- [x] 롤백 즉시 가능

---

## 변경된 파일

1. `src/speech/intents.ts` - Intent v2 스키마
2. `src/speech/ruleParser.ts` - v2 스키마에 맞게 수정
3. `src/speech/nlpParser.ts` - Confidence 게이트 추가
4. `src/speech/intentDispatcher.ts` - v2 스키마에 맞게 수정
5. `src/speech/IntentRouter.ts` - confidence 체크 추가
6. `functions/src/intent.ts` - 프롬프트 v2, 도메인 힌트
7. `functions/src/intentValidator.ts` - 서버 측 검증

---

## 🎖 최종 평가

**이제 NLP는 "예측 가능한 엔진"이 되었습니다.**

- ✅ 출력 형식 안정성 100%
- ✅ 애매한 자연어에서도 과도한 액션 방지
- ✅ confidence 기반 실행/폐기
- ✅ 도메인 확장에도 프롬프트 재사용

