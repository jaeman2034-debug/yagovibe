# 🧠 Phase 6 — NLP 전환 설계 (실서비스 기준)

## 목표

**Rule-based → NLP(LLM) 점진 전환**
- A/B 스위치 가능, 언제든 롤백
- 비용/지연/프라이버시 통제
- 의도(JSON)만 반환 (실행은 기존 Dispatcher)

---

## 6-0. 전제 (불변 원칙)

### ❌ 절대 금지

- 페이지/컴포넌트에서 LLM 직접 호출 금지
- 자동 재시도/자동 재시작 금지
- Dispatcher/UX 변경 금지

### ✅ 필수 원칙

- Parser만 교체 (Dispatcher/UX 불변)
- 1 STT 결과 → 1 Intent → stopAll
- NLP 실패 시 무조건 규칙 파서로 fallback

---

## 6-1. 아키텍처

```
STT text
  └─ IntentRouter
      ├─ RuleParser (기존)
      └─ NLPParser (LLM)
           └─ Edge Function (server)
                └─ LLM API
→ Intent(JSON)
→ IntentDispatcher (기존)
→ stopAll
```

**IntentRouter가 A/B와 fallback을 모두 관리.**

---

## 6-2. IntentRouter (A/B + Fallback)

**로직:**
1. 항상 규칙 파서 먼저 시도 (빠름/무료)
2. UNKNOWN일 때만 NLP 시도
3. NLP_RATIO 기반 A/B 테스트
4. NLP 실패 시 무조건 규칙으로 fallback

**설정:**
- `VITE_NLP=on` (NLP 활성화)
- `VITE_NLP_RATIO=0.2` (20%만 NLP)

---

## 6-3. Edge Function (프라이버시/지연 통제)

### 이유
- API 키 보호
- 프롬프트/스키마 통제
- 타임아웃/레이트리밋

### 요청 스키마
```json
{
  "text": "농구 보여줘",
  "pathname": "/sports-hub"
}
```

### 응답 스키마
```json
{
  "intent": "NAVIGATE",
  "payload": { "to": "/sports-hub?category=basketball" },
  "confidence": 0.86
}
```

---

## 6-4. 프롬프트 (짧고 강제)

```
You are an intent classifier.
Return ONLY valid JSON.

Allowed intents:
- NAVIGATE { to }
- SEARCH { query }
- SCROLL { direction }
- STOP {}
- UNKNOWN {}

Rules:
- Do not explain.
- If unsure, return UNKNOWN.
- Prefer concise payloads.
```

**설명 금지 / JSON만 → 파싱 안전.**

---

## 6-5. NLP Parser (클라이언트)

**가드:**
- 타임아웃 800ms
- confidence < 0.7 → discard
- 실패 시 null 반환 (fallback)

---

## 6-6. 비용/지연 가드 (천재 포인트)

- ✅ UNKNOWN일 때만 NLP 시도
- ✅ 짧은 문장만 (40자 제한)
- ✅ 타임아웃 800ms
- ✅ confidence < 0.7 → discard
- ✅ NLP_RATIO 점진 확대

---

## 6-7. 텔레메트리 연계

**메트릭:**
- NLP 성공/실패 카운트
- rule 대비 전환율 상승 여부 확인
- 실패 시 즉시 비활성화 가능

**로깅:**
```typescript
logMetric({ type: "NLP_USED", ok: true, pathname });
```

---

## 6-8. 출시 전략 (안전)

### Week 1: NLP off (baseline)
- 규칙 파서만 사용
- 성능 기준선 확보

### Week 2: 10% on (UNKNOWN만)
- UNKNOWN만 NLP 시도
- 성공률 모니터링

### Week 3: 30% on
- NLP_RATIO 확대
- 비용/지연 모니터링

### Week 4: 규칙 대비 성능 >15%면 확대
- 성능 기준 미달 → 즉시 off, 규칙 유지
- 성능 기준 달성 → NLP_RATIO 확대

---

## 6-9. 완료 체크리스트

- [ ] NLP off여도 앱 100% 동작
- [ ] LLM 장애 시 UX 영향 0
- [ ] 개인정보 원문 저장 ❌
- [ ] 지연 체감 ❌
- [ ] 롤백 1초 컷

---

## 🏁 Phase 6 결론

**NLP는 "마술"이 아니라 "옵션 엔진"이다.**

지금 구조는 옵션을 안전하게 얹을 수 있는 완성형.

**핵심:**
- ✅ 기존 구조 절대 깨지 않음
- ✅ 언제든 롤백 가능
- ✅ 비용/지연 통제
- ✅ 점진적 확대

