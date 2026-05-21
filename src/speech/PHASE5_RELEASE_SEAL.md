# 🛡 Phase 5 — RELEASE SEAL CHECKLIST

## 목표
**"실수해도 안 깨지는 상태"를 체크리스트로 증명하고 그대로 출시**

---

## 5-1️⃣ 기능 봉인 (Regression Zero)

### ✅ 음성 시스템

- [ ] **Desktop에서 마이크 권한 팝업 0회**
  - [ ] Desktop 콘솔 로그 1줄만 출력: `[Speech] disabled (desktop)`
  - [ ] 마이크 버튼 렌더링 ❌
  - [ ] `SpeechManager.startListeningByUserGesture()` 호출 차단 확인

- [ ] **모바일에서 STT 중복 시작 0**
  - [ ] 1 명령 = 1 액션 = 1 stop 유지
  - [ ] 명령 처리 후 `SpeechManager.stopAll()` 즉시 호출 확인
  - [ ] 자동 재시작 ❌

- [ ] **UNKNOWN 명령 시 UI 변화 ❌**
  - [ ] TTS 피드백만 ("다시 한 번 말해 주세요")
  - [ ] 페이지 이동 ❌
  - [ ] 상태 변경 ❌

### 🔒 필수 가드 (최종 확인)

다음 3군데 모두 `if (!isMobileDevice()) return;` 존재해야 통과:

1. [ ] `SpeechManager.startListeningByUserGesture()`
2. [ ] `VoiceMicButton` 렌더링
3. [ ] `speechEngine.listenOnce()`

---

## 5-2️⃣ Auth / Routing 봉인

### ✅ 로그인 안정성

- [ ] **LoginPage mounted 로그 1회**
  - [ ] 로그인 과정에서 `[LoginPage] mounted` 단 1회만 출력
  - [ ] `[LoginPage] unmounted` 로그 ❌

- [ ] **입력 중 unmounted 로그 ❌**
  - [ ] 사용자 입력 중 컴포넌트 언마운트 없음
  - [ ] 입력값 유지 확인

- [ ] **navigate()는 AuthProvider / Route 레벨에서만**
  - [ ] `LoginPage` 내부 `navigate()` 직접 호출 ❌
  - [ ] `PublicRoute`/`ProtectedRoute`에서만 `Navigate` JSX 사용

### ❌ 금지 패턴 재확인

```typescript
// ❌ 절대 금지 (App / Layout에 있으면 즉시 실패)
if (loading) return <Loading />;
```

**대신:**
```typescript
// ✅ 정답
if (loading) return null; // 렌더링만 차단, 언마운트 안 함
```

---

## 5-3️⃣ DEV / PROD 완전 분리

### ✅ DEV 전용 (PROD에서 완전 제거)

- [ ] **Eruda ❌ (PROD)**
  - [ ] `index.html`에서 `import.meta.env.DEV` 체크 확인
  - [ ] PROD 빌드에서 Eruda 스크립트 로드 ❌

- [ ] **Speech Debug UI ❌ (PROD)**
  - [ ] 디버그 패널/톱니 아이콘 PROD에서 렌더링 ❌
  - [ ] `import.meta.env.DEV` 조건부 렌더링 확인

- [ ] **transcript 원문 로그 ❌ (PROD)**
  - [ ] `console.warn("[Voice][UNKNOWN]", { transcript, ... })` DEV만
  - [ ] PROD는 해시만: `console.warn("[Voice][UNKNOWN]", event)`

### ✅ PROD 전용

- [ ] **console.log 최소화**
  - [ ] 상세 디버그 로그는 `import.meta.env.DEV` 조건부
  - [ ] PROD는 필수 로그만: `[Speech] command executed`

- [ ] **UNKNOWN telemetry hash only**
  - [ ] Firestore에 원문 저장 ❌
  - [ ] 해시 + 메타데이터만 저장

- [ ] **feature flag 기반**
  - [ ] 환경 변수로 기능 토글 가능

---

## 5-4️⃣ 보안 & 개인정보

### 🔐 음성 데이터

- [ ] **Firestore에 원문 transcript 저장 ❌**
  - [ ] `telemetry.ts`에서 원문 저장 코드 없음 확인
  - [ ] 해시만 저장: `stableHash(normalized)`

- [ ] **로그에 음성 텍스트 ❌ (PROD)**
  - [ ] DEV: `console.warn("[Voice][UNKNOWN]", { transcript, ... })`
  - [ ] PROD: `console.warn("[Voice][UNKNOWN]", event)` (해시만)

- [ ] **UNKNOWN은 hash + meta만**
  - [ ] `voice_telemetry` 컬렉션 스키마 확인
  - [ ] `hash`, `pathname`, `device`, `ts`, `v`만 저장

### 🔐 Firestore rules

```javascript
match /voice_telemetry/{docId} {
  allow create: if true;
  allow read, update, delete: if false;
}
```

- [ ] **쓰기만 허용 확인**
  - [ ] 클라이언트 읽기 차단
  - [ ] 데이터 유출 위험 0

---

## 5-5️⃣ 퍼포먼스 & UX

### 📱 모바일 체감

- [ ] **마이크 버튼 반응 < 100ms**
  - [ ] 클릭 → STT 시작까지 지연 최소화
  - [ ] `onClick` 핸들러 최적화 확인

- [ ] **STT 종료 후 UI freeze ❌**
  - [ ] 명령 처리 후 즉시 `stopAll()` 호출
  - [ ] UI 스레드 블로킹 없음

- [ ] **네트워크 실패 시 UX 영향 ❌**
  - [ ] Firestore 실패해도 앱 정상 동작
  - [ ] `try-catch`로 조용히 실패 처리

### ⚙️ 번들

- [ ] **Desktop에서 STT 엔진 import 안 됨 (tree-shake)**
  - [ ] `isMobileDevice()` 가드로 조건부 import
  - [ ] PROD 빌드에서 불필요한 코드 제거 확인

- [ ] **DEV 도구 PROD 번들에 없음**
  - [ ] Eruda, 디버그 UI 번들에서 제외 확인
  - [ ] `import.meta.env.DEV` 조건부 코드 제거 확인

---

## 5-6️⃣ 실제 QA 시나리오 (이거 통과하면 끝)

### 시나리오 A: 정상 명령

1. 모바일 접속
2. 로그인
3. `/sports-hub` 이동
4. 🎙 "농구" 명령
5. 카테고리 변경 확인
6. 음성 종료 확인

**✅ 성공 기준:**
- 한 번에 동작
- 추가 반응 ❌
- STT 1회만 시작
- 명령 후 즉시 종료

### 시나리오 B: UNKNOWN 명령

1. 모바일 접속
2. 로그인
3. `/sports-hub` 이동
4. 🎙 "엉뚱한 말" (예: "날씨 알려줘")
5. UNKNOWN 처리 확인

**✅ 성공 기준:**
- UI 변화 ❌
- TTS 피드백만 ("다시 한 번 말해 주세요")
- Firestore에 해시 저장 (원문 없음)
- STT 즉시 종료

### 시나리오 C: Desktop 차단

1. 데스크톱 접속
2. 마이크 버튼 확인
3. 권한 요청 확인

**✅ 성공 기준:**
- 마이크 버튼 ❌ (렌더링 안 됨)
- 권한 요청 ❌
- 콘솔 로그: `[Speech] disabled (desktop)` 단 1줄만

---

## 🧪 Phase 5 자동 점검 로그 (권장)

### 릴리즈 직전 콘솔에서 이것만 확인:

**Desktop:**
```
[Speech] disabled (desktop)
```

**Mobile:**
```
[Speech] start (mobile)
[Speech] command executed
```

**이외 로그 = ❌**

---

## 🏁 Phase 5 통과 선언 기준

아래 모두 **YES**면 출시 가능:

- [ ] 기능 OK
- [ ] 튕김 0
- [ ] UX 혼란 요소 0
- [ ] DEV 잔여물 0
- [ ] 데이터 수집 안전

---

## 🎖 최종 평가 (천재 모드 결론)

**이 앱은 이제 '운 좋게 돌아가는 앱'이 아니라 '구조적으로 망가질 수 없는 앱'이다.**

이 상태면:
- ✅ 스토어 심사 OK
- ✅ 사용자 클레임 최소
- ✅ 기능 추가해도 안전

