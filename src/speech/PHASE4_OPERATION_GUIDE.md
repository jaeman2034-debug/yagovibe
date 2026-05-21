# 🔥 Phase 4-2: 실사용 로그 기반 진화 운영 가이드

## 📋 개요

UNKNOWN 음성 명령을 안전하게 수집하여 UX 개선 근거를 확보하는 시스템입니다.

**핵심 원칙:**
- ✅ 원문 transcript 저장 ❌ (개인정보 보호)
- ✅ 해시 + 메타데이터만 저장
- ✅ 비용/복잡도 최소
- ✅ 실패해도 UX 영향 없음

---

## 🗂️ Firestore 컬렉션 구조

### Collection: `voice_telemetry`

```typescript
{
  type: "UNKNOWN",              // 이벤트 타입
  hash: "a94f3e1c",              // 정규화된 transcript 해시
  pathname: "/sports-hub",       // 발생 페이지
  device: "mobile",              // mobile | desktop
  ts: Timestamp,                 // 서버 타임스탬프
  v: "1.3.2"                     // 앱 버전
}
```

**❗ 중요:**
- 원문 transcript 없음
- 개인정보/민감 정보 저장 안 함 → 심사/리뷰 안전

---

## 🔒 Firestore 보안 규칙

```javascript
match /voice_telemetry/{docId} {
  allow create: if true;          // 클라이언트 write 허용
  allow read, update, delete: if false;  // 클라이언트 읽기 차단
}
```

**✅ 쓰기만 허용**
**❌ 클라이언트 읽기 차단**
**❌ 데이터 유출 위험 0**

---

## 📅 운영 루틴 (주 1회 / 20분)

### Step 1: Firestore에서 집계 조회

Firebase Console → Firestore → `voice_telemetry` 컬렉션

**쿼리 예시:**
```javascript
// hash별 빈도수 집계 (관리자 Functions에서 실행)
const stats = await getUnknownHashStats(20);
// → [{ hash: "a94f3e1c", count: 45 }, ...]
```

### Step 2: TOP 20 해시 확인

1. Firebase Console에서 `voice_telemetry` 컬렉션 열기
2. `hash` 필드로 그룹화하여 빈도수 확인
3. TOP 20 해시 추출

### Step 3: 실제 문장 추정 (DEV 환경에서만)

**⚠️ 주의: 원문은 저장되지 않으므로, 해시를 역추적할 수 없습니다.**

**대안:**
1. DEV 환경에서 콘솔 로그 확인
   - `[Voice][UNKNOWN]` 로그에서 원문 확인
2. 사용자 피드백 수집
   - "어떤 말을 했는데 반응이 없었나요?" 설문
3. 패턴 기반 추정
   - 해시 빈도수와 pathname 조합으로 패턴 추정

### Step 4: 처리 결정

각 해시에 대해 아래 3가지 중 하나로 처리:

#### A. alias 추가 (keywords 확대)

**예시:**
```typescript
// intentParser.ts 또는 commands/sportsHub.ts
{
  keywords: ["홈으로 가", "처음으로", "메인"],  // ← 새로 추가
  action: async ({ ui }) => {
    await ui.goHome();
  },
}
```

#### B. intent 규칙 보완 (parseIntent 개선)

**예시:**
```typescript
// intentParser.ts
if (/(꺼 줘|스톱|중단)/.test(t)) {
  return { type: "STOP" };  // ← 새 intent 타입 추가
}
```

#### C. 기각 (지원하지 않는 기능)

**예시:**
- "날씨 알려줘" → 스포츠 앱 범위 밖 → 지원 안 함
- "음악 틀어줘" → 스포츠 앱 범위 밖 → 지원 안 함

---

## 🧠 NLP 필요 여부 판단

**이 데이터로 NLP/LLM 전환 필요 여부를 판단할 수 있습니다:**

- **규칙 기반으로 충분한 경우:**
  - TOP 20 해시가 명확한 패턴으로 분류 가능
  - alias 추가로 80% 이상 커버 가능

- **NLP/LLM이 필요한 경우:**
  - 해시 패턴이 너무 다양하고 규칙으로 커버 불가
  - "자연어가 너무 다양해질 때"
  - 명령어가 20~30개 넘어갈 때

---

## ✅ PROD 안전성 최종 보증

- [x] 음성 실패 → UX 영향 0
- [x] 네트워크 실패 → 무시
- [x] 개인정보 저장 ❌
- [x] 비용: 거의 0원 (Firestore 무료 할당량 내)
- [x] 구조 변경 없음

---

## 🏁 Phase 4 상태 선언

**이제 음성 시스템은 "스스로 좋아지는 구조"를 가졌습니다.**

- 튕김 ❌
- 추측 ❌
- 감각 ❌
- **→ 데이터 기반 진화 ✅**

