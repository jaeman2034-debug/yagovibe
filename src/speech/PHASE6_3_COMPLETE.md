# 🧠 Phase 6-3 — Intent 학습 데이터 루프 설계 완료

## 목표 달성

**UNKNOWN 음성 데이터를 의미 있는 학습 신호로 전환**
**사람이 매번 로그를 들여다보지 않아도 됨**
**규칙(Rule)·프롬프트(NLP) 둘 다 개선 가능**
**오동작 리스크 0 유지**

---

## 6-3.1 데이터 파이프라인 (정답 구조) ✅

```
UNKNOWN 발생
  ↓
Telemetry 저장 (hash + meta)
  ↓
주기적 집계 (batch)
  ↓
패턴 클러스터링 (hash 빈도)
  ↓
자동 개선안 생성 (alias / rule / prompt)
  ↓
사람 승인 (1-click)
  ↓
배포
```

**🔥 자동 제안 + 사람 승인이 핵심 균형**

---

## 6-3.2 집계 모델 (주 1회 Batch) ✅

### 집계 기준

- hash
- pathname
- count
- firstSeen / lastSeen
- appVersion

### 결과 예시

```json
{
  "hash": "a94f3e1c",
  "pathname": "/sports-hub",
  "count": 27,
  "suggested": "CATEGORY:basketball"
}
```

**구현:** `src/speech/learning/aggregator.ts`

---

## 6-3.3 자동 제안 로직 (Rule-first) ✅

### 자동 제안 규칙

- 같은 hash가 N회 이상 (예: 10회)
- pathname이 고정
- 기존 intent와 의미적으로 근접
- → alias 후보 생성

### 예시

```
hash=a94f3e1c (27회, /sports-hub)
과거 rule: "농구", "바스켓볼"
👉 제안: keyword alias 추가
keywords: ["농구 경기", "농구 보여줘"]
```

**구현:** `src/speech/learning/suggester.ts`

---

## 6-3.4 NLP 프롬프트 자동 개선 (옵션) ✅

### UNKNOWN 중 Rule로 커버 불가한 상위 5개만 대상

자동 프롬프트 패치 예시:

```
Additional examples:
User: "농구 보여줘"
Intent: NAVIGATE { to: "/sports-hub?category=basketball" }
```

**→ few-shot 예제 자동 추가**

---

## 6-3.5 승인 워크플로우 (사람 1클릭) ✅

### 최소 UI (Admin / Console)

**리스트:**
- hash / count / suggested intent

**버튼:**
- ✅ 승인 → rule 추가
- ❌ 무시 → blacklist
- 🧪 NLP-only → 프롬프트 반영

**사람 판단은 "YES/NO"만**

**구현:** `firestore.rules`에 `voice_suggestions` 컬렉션 추가

---

## 6-3.6 블랙리스트 (중요) ✅

### 지원 안 할 명령을 명확히 막아야 UX가 안정

```typescript
const BLACKLIST_PATTERNS = [
  /^(그거|이거|저거|아무거나|아무것|뭐든지)/,
  /^(그|이|저|뭐|어떤|어디|언제|누구|왜)$/,
  /^.{0,2}$/, // 너무 짧은 입력
];
```

**이 패턴은 영구 UNKNOWN**
**NLP에도 보내지 않음 (비용 절약)**

**구현:** `src/speech/learning/blacklist.ts`

---

## 6-3.7 자동 품질 가드 ✅

### 실행 전 가드

- 신규 rule은 confidence 낮게 시작
- 처음 1주일은 shadow mode
- 실행 ❌
- 매칭만 로그

### 통과 조건

- 오동작 0
- 성공률 ≥ 기존 대비 +10%

---

## 6-3.8 최종 안정 루프 (천재 포인트) ✅

**Rule 확장 → 즉시 UX 개선**
**NLP는 보조/보완**
**데이터가 "써야 할지 말지"를 결정**
**감각이 아니라 숫자로 결정**

---

## 🏁 Phase 6-3 완료 기준

- [x] UNKNOWN 상위 패턴 자동 집계
- [x] alias 제안 자동 생성
- [x] 사람 승인 1-click (Firestore 구조)
- [x] 오동작 0 유지 (블랙리스트)
- [x] NLP 비용 통제 (블랙리스트로 차단)

---

## 변경된 파일

1. `src/speech/learning/blacklist.ts` - 블랙리스트 시스템
2. `src/speech/learning/aggregator.ts` - 집계 로직
3. `src/speech/learning/suggester.ts` - 자동 제안 로직
4. `functions/src/voiceLearning.ts` - 배치 집계 함수
5. `src/speech/ruleParser.ts` - 블랙리스트 체크 추가
6. `src/speech/IntentRouter.ts` - 블랙리스트 체크 추가 (NLP 호출 전)
7. `firestore.rules` - `voice_suggestions` 컬렉션 규칙 추가
8. `functions/src/exports/voice.ts` - voiceLearning export 추가

---

## 🎯 Phase 6 전체 요약

### 6-1: Edge Function & 안전 호출 ✅
- Firebase Functions로 LLM 호출
- API 키 보호, 타임아웃, 에러 처리

### 6-2: 프롬프트/스키마 고정 ✅
- Intent v2 스키마 (confidence 포함)
- 서버 측 검증
- Confidence 게이트 (0.7 미만 폐기)

### 6-3: 학습 루프 자동화 ✅
- UNKNOWN 패턴 집계
- 자동 제안 생성
- 블랙리스트로 비용 통제

---

## 🎖 최종 평가

**이제 음성 시스템은 "스스로 똑똑해지는 구조"다.**

- ✅ UNKNOWN 데이터 → 학습 신호 전환
- ✅ 사람 개입 최소화
- ✅ Rule-first 접근 (비용 효율)
- ✅ 블랙리스트로 오동작/비용 통제
- ✅ 데이터 기반 결정 (감각 ❌, 숫자 ✅)

