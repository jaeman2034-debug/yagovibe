# 🚀 Phase 8 — 추천형 음성 UX (Proactive but Safe) 완료

## 목표 달성

**사용자가 말하지 않아도 "도움이 되는 한마디"를 정확한 순간에만 제안**
**❗ 원칙: 방해 ❌ / 강요 ❌ / 항상 끌 수 있음**

---

## 8-1️⃣ 추천이 "허용되는 순간" 정의 (가장 중요) ✅

### ✅ 추천 허용 조건 (ALL 만족)

- 모바일 ✅
- 음성 세션 직후 또는 명령 성공 후 (3초 이내)
- 최근 7일 내 동일 intent 2회 이상
- confidence ≥ 0.85
- 하루 최대 2회
- 최소 1시간 간격

### ❌ 절대 금지

- 앱 진입 즉시
- 로그인/결제/민감 화면
- 연속 추천
- 실패 직후

**구현:** `src/speech/recommendation/guard.ts`

---

## 8-2️⃣ 추천의 형태 (UX 정답) ✅

### 🎧 음성은 "질문형"만 허용

**예시:**
- "요즘 농구 경기 많이 보고 있어요. 바로 보여드릴까요?"
- "근처 러닝 모임을 자주 찾으시네요. 다시 열어드릴까요?"

**👉 Yes/No만 받는다**
**👉 실행은 사용자 응답 후에만**

**구현:** `src/speech/recommendation/engine.ts` - `generateQuestion()`

---

## 8-3️⃣ 추천 Intent 타입 추가 (엄격) ✅

```typescript
type Intent =
  | { type: "RECOMMEND"; payload: { key: string }; confidence: number }
  | { type: "CONFIRM_YES"; payload: {}; confidence: number }
  | { type: "CONFIRM_NO"; payload: {}; confidence: number }
  | ...기존
```

**RECOMMEND는 실행 ❌**
**CONFIRM_YES에서만 실행**

**구현:** `src/speech/intents.ts`, `src/speech/ruleParser.ts`

---

## 8-4️⃣ 추천 엔진 (아주 단순하게) ✅

### 입력 신호

- `user_voice_profile.topIntents`
- 최근 사용 시각
- 현재 pathname

### 출력

```typescript
{
  key: "NAVIGATE:/sports-hub?category=basketball",
  confidence: 0.9,
  reason: "recent_frequency",
  question: "요즘 농구 경기 많이 보고 있어요. 바로 보여드릴까요?"
}
```

**구현:** `src/speech/recommendation/engine.ts`

---

## 8-5️⃣ 추천 파이프라인 ✅

```
Command 성공
  ↓
조건 체크 (canRecommend)
  ↓
추천 후보 1개 생성 (generateRecommendation)
  ↓
TTS 질문 (speechManager.speak)
  ↓
사용자 응답
  ├─ YES (CONFIRM_YES) → 실행
  └─ NO (CONFIRM_NO) → 종료 + 쿨다운
```

**구현:** `src/speech/SpeechCommandBridge.tsx`

---

## 8-6️⃣ 코드 스켈레톤 (핵심만) ✅

```typescript
if (canRecommend(userProfile, context)) {
  const recommendation = generateRecommendation(userProfile, pathname);
  if (recommendation && recommendation.confidence >= 0.85) {
    recommendationManager.setPending(recommendation);
    await speechManager.speak(recommendation.question);
  }
}

if (intent.type === "CONFIRM_YES" && pendingKey) {
  executeRecommendation(pendingKey, { navigate, onSearch });
}
```

---

## 8-7️⃣ 안전 가드 (천재 포인트) ✅

### 추천은 항상 opt-out

- "괜찮아요" 한 번이면 24시간 추천 중단
- 추천 실패/거절은 학습 신호로만 사용
- 추천으로 인한 오동작 0건 유지

**구현:**
- `setRecommendCooldown()` - 24시간 쿨다운
- `isInRecommendCooldown()` - 쿨다운 체크
- 하루 2회 제한
- 최소 1시간 간격

---

## 8-8️⃣ 성공 지표 (숫자로 판단) ✅

### 최소 지표

- 추천 노출 대비 수락률 ≥ 20%
- 추천 거절 후 이탈률 증가 ❌
- 사용자 불만 0

**향후 구현:** Firestore에 추천 메트릭 저장

---

## 🏁 Phase 8 완료 기준

- [x] 추천은 질문형만
- [x] 실행은 사용자 확인 후
- [x] 하루 2회 제한
- [x] OFF 스위치 존재 (`VITE_RECOMMENDATION=off`)
- [x] 오동작 0 (엄격한 조건 체크)

---

## 변경된 파일

1. `src/speech/intents.ts` - RECOMMEND, CONFIRM_YES, CONFIRM_NO 추가
2. `src/speech/recommendation/guard.ts` - 추천 허용 조건 체크
3. `src/speech/recommendation/engine.ts` - 추천 엔진
4. `src/speech/recommendation/manager.ts` - 추천 상태 관리
5. `src/speech/ruleParser.ts` - CONFIRM_YES/NO 파싱 추가
6. `src/speech/intentDispatcher.ts` - CONFIRM_YES/NO 처리
7. `src/speech/nlpParser.ts` - RECOMMEND, CONFIRM_YES/NO 매핑 추가
8. `src/speech/SpeechCommandBridge.tsx` - 추천 파이프라인 통합

---

## 🧠 전체 진화의 최종 모습

| Phase | 결과 |
|-------|------|
| 6 | 이해한다 (NLP) |
| 7 | 나를 안다 (개인화) |
| 8 | 적절히 돕는다 (추천) |

**이게 "똑똑한 앱"의 정석이다.**

---

## 🎖 최종 평가

**이제 음성 시스템은 "적절히 도와주는 구조"다.**

- ✅ 정확한 순간에만 제안
- ✅ 질문형만 (Yes/No)
- ✅ 실행은 사용자 확인 후
- ✅ 하루 2회 제한
- ✅ 24시간 쿨다운 (opt-out)
- ✅ 방해 ❌ / 강요 ❌

