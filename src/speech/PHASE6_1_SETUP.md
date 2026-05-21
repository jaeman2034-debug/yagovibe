# 🧠 Phase 6-1 — Edge Function 실전 구현 가이드

## 목표

**클라이언트에서 LLM 직접 호출 ❌**
**Edge Function 1개로 Intent만 반환**
**실패/지연/비용 전부 통제**

---

## 1️⃣ Firebase Functions 배포

### Step 1: Functions 코드 확인

```bash
# functions/src/intent.ts 파일 확인
cat functions/src/intent.ts
```

### Step 2: Functions index.ts에 export 추가

`functions/src/index.ts` 또는 `functions/index.ts`에 다음 추가:

```typescript
export { intent } from "./src/intent";
```

### Step 3: 환경 변수 설정

Firebase Functions에 OpenAI API 키 설정:

```bash
# Firebase CLI로 환경 변수 설정
firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY"

# 또는 Firebase Console에서:
# Functions → Configuration → Environment variables
# OPENAI_API_KEY = YOUR_OPENAI_API_KEY
```

### Step 4: Functions 빌드 및 배포

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions:intent
```

---

## 2️⃣ 클라이언트 환경 변수 설정

### `.env.local` (로컬 개발)

```bash
# NLP 활성화 (on/off)
VITE_NLP=on

# NLP 사용 비율 (0.0 ~ 1.0)
VITE_NLP_RATIO=0.2

# Firebase Functions URL (로컬 개발 시)
VITE_FIREBASE_FUNCTIONS_URL=http://localhost:5001/yago-vibe-spt/us-central1
```

### `.env.production` (프로덕션)

```bash
# NLP 활성화
VITE_NLP=on

# NLP 사용 비율 (점진적 확대)
VITE_NLP_RATIO=0.1

# Firebase Functions URL (프로덕션)
VITE_FIREBASE_FUNCTIONS_URL=https://us-central1-yago-vibe-spt.cloudfunctions.net
```

---

## 3️⃣ 로컬 개발 테스트

### Step 1: Firebase Emulator 시작

```bash
firebase emulators:start --only functions
```

### Step 2: 클라이언트 개발 서버 시작

```bash
npm run dev
```

### Step 3: 테스트

1. 모바일 브라우저에서 접속
2. 로그인
3. `/sports-hub` 이동
4. 마이크 버튼 탭
5. "농구 보여줘" 명령
6. 콘솔에서 NLP 로그 확인

**예상 로그:**
```
[NLP] Edge Function 호출: /intent
[IntentRouter] NLP 성공: NAVIGATE
```

---

## 4️⃣ API 계약 (고정)

### Request

```json
{
  "text": "농구 보여줘",
  "pathname": "/sports-hub"
}
```

### Response

```json
{
  "intent": "NAVIGATE",
  "payload": { "to": "/sports-hub?category=basketball" },
  "confidence": 0.86
}
```

**❗ 설명 텍스트 ❌**
**❗ JSON only**

---

## 5️⃣ 안전장치 요약

### ✅ NLP off → 앱 100% 정상

```bash
# .env.local
VITE_NLP=off
```

→ 규칙 파서만 사용, NLP 호출 없음

### ✅ LLM 장애 → UX 영향 0

- Edge Function 실패 시 `UNKNOWN` 반환
- 클라이언트에서 `null` 반환
- IntentRouter가 규칙 파서로 fallback

### ✅ 비용 폭주 ❌

- UNKNOWN일 때만 NLP 시도
- NLP_RATIO 기반 샘플링 (기본 20%)
- 40자 제한

### ✅ 프롬프트 통제 → 예측 가능

- 짧고 강제된 프롬프트
- JSON만 반환
- temperature: 0 (일관성)

### ✅ 롤백 → env 값 1줄

```bash
# 즉시 NLP 비활성화
VITE_NLP=off
```

---

## 6️⃣ Phase 6-1 완료 기준

- [ ] Edge Function 배포 완료
- [ ] DEV에서 NLP on/off 스위치 동작 확인
- [ ] UNKNOWN → 일부만 NLP로 해결 확인
- [ ] 실패 시 항상 규칙 fallback 확인

---

## 7️⃣ 트러블슈팅

### 문제: Functions 배포 실패

**해결:**
```bash
cd functions
npm install
npm run build
# 빌드 오류 확인 후 수정
```

### 문제: API 키 오류

**해결:**
```bash
# Firebase Console에서 확인
# Functions → Configuration → Environment variables
# OPENAI_API_KEY 설정 확인
```

### 문제: CORS 오류

**해결:**
- `functions/src/intent.ts`에서 CORS 헤더 확인
- 클라이언트에서 올바른 URL 사용 확인

### 문제: 타임아웃

**해결:**
- `nlpParser.ts`에서 타임아웃 800ms 확인
- Edge Function 타임아웃 설정 확인 (기본 60초)

---

## 🏁 Phase 6-1 완료

**이제 NLP는 "옵션 엔진"으로 안전하게 작동합니다.**

- ✅ 기존 구조 절대 깨지지 않음
- ✅ 언제든 롤백 가능
- ✅ 비용/지연 통제
- ✅ 실패해도 UX 영향 없음

