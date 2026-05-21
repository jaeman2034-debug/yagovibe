# 🔑 Firebase Functions Secret 설정 완료 가이드

## 🚨 문제 확인 완료

### 현재 상태
- ✅ `process.env.OPENAI_API_KEY`를 사용하는 코드: **189개 함수**
- ❌ `secrets: ["OPENAI_API_KEY"]` 선언: **0개 함수**
- ❌ Secret이 로드되지 않아 배포 실패

### 원인
Firebase Functions V2에서는 Secret을 사용하려면 각 함수마다 명시적으로 선언해야 합니다:
```typescript
export const myFunction = onCall(
  {
    secrets: ["OPENAI_API_KEY"], // ← 이 선언이 없으면 Secret이 로드되지 않음
  },
  async (req) => {
    // process.env.OPENAI_API_KEY 사용 가능
  }
);
```

## ✅ 해결 방법

### 방법 1: Firebase Console에서 Environment Variable 설정 (가장 빠름 - 권장)

**장점:**
- 코드 수정 불필요
- 즉시 적용 가능
- 모든 함수에 자동으로 적용

**단점:**
- Secret Manager보다 보안 수준이 약간 낮음 (하지만 실용적)

**실행 방법:**

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/yago-vibe-spt/functions/config
   ```

2. **Environment variables 탭 클릭**

3. **Add variable 버튼 클릭**
   - Key: `OPENAI_API_KEY`
   - Value: OpenAI API Key 입력 (예: `sk-...`)
   - **Save** 클릭

4. **Functions 재배포**
   ```bash
   firebase deploy --only functions
   ```

5. **확인**
   ```bash
   firebase functions:log
   ```
   - `Missing OPENAI_API_KEY` 메시지가 없어야 함

### 방법 2: Secret Manager 사용 (더 안전, 코드 수정 필요)

**장점:**
- 더 안전함 (자동 암호화)
- Secret Manager로 관리

**단점:**
- 189개 함수 모두에 `secrets: ["OPENAI_API_KEY"]` 선언 필요
- 시간이 많이 걸림

**실행 방법:**

#### Step 1: Secret Manager에 등록
```bash
firebase functions:secrets:set OPENAI_API_KEY
```

#### Step 2: 각 함수에 secrets 선언 추가

예시 - `routeVoiceCommand.ts`:
```typescript
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const openaiApiKey = defineSecret("OPENAI_API_KEY");

export const routeVoiceCommand = onCall(
  {
    secrets: [openaiApiKey], // ← 추가 필요
  },
  async (req) => {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: openaiApiKey.value(), // process.env 대신 사용
    });
    // ...
  }
);
```

#### Step 3: 모든 함수 수정 (189개)

모든 함수에 동일한 패턴으로 수정 필요.

## 🎯 권장 작업 순서

### 즉시 실행 (빠른 해결)

1. ✅ **Firebase Console에서 Environment Variable 설정**
   - 가장 빠르고 간단함
   - 코드 수정 불필요

2. ✅ **Functions 재배포**
   ```bash
   firebase deploy --only functions
   ```

3. ✅ **확인**
   ```bash
   firebase functions:log
   ```

### 장기적 개선 (선택 사항)

나중에 시간이 있을 때:
- Secret Manager로 전환
- 각 함수에 `secrets: ["OPENAI_API_KEY"]` 선언 추가

## 📝 현재 코드 구조

### 주요 함수들 (예시)

1. `routeVoiceCommand` - `onCall` 사용
2. `voiceAnalyticsAssistant` - `onCall` 사용
3. `analyzeProduct` - `onRequest` 사용
4. 기타 186개 함수들...

모두 `process.env.OPENAI_API_KEY`를 사용하지만, `secrets: ["OPENAI_API_KEY"]` 선언이 없습니다.

## ⚠️ 참고

- Environment Variable: Firebase Console에서 관리, 즉시 사용 가능
- Secret Manager: 더 안전하지만 각 함수에 선언 필요
- 현재는 Environment Variable 설정이 가장 빠른 해결책

## ✅ 빠른 체크리스트

- [ ] Firebase Console 접속
- [ ] Functions > Configuration > Environment variables
- [ ] OPENAI_API_KEY 추가
- [ ] `firebase deploy --only functions` 실행
- [ ] `firebase functions:log`로 확인
- [ ] `Missing OPENAI_API_KEY` 메시지 없음 확인

