# 🔑 Firebase Functions Secret 설정 가이드

## 🚨 현재 문제

Firebase Functions V2에서 Secret을 사용하려면 **각 함수마다 `secrets: ["OPENAI_API_KEY"]`를 명시적으로 선언**해야 합니다.

### 현재 코드 상태
- ✅ `process.env.OPENAI_API_KEY`를 사용하는 코드는 있음
- ❌ `secrets: ["OPENAI_API_KEY"]` 선언이 없음
- ❌ Secret이 로드되지 않아 `process.env.OPENAI_API_KEY`가 `undefined`

## ✅ 해결 방법

### 방법 1: 각 함수에 secrets 선언 추가 (권장)

Firebase Functions V2에서는 각 함수마다 사용할 Secret을 명시해야 합니다:

```typescript
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

// Secret 정의
const openaiApiKey = defineSecret("OPENAI_API_KEY");

export const myFunction = onCall(
  {
    secrets: [openaiApiKey], // ← 반드시 필요!
  },
  async (req) => {
    const openai = new OpenAI({
      apiKey: openaiApiKey.value(), // Secret 값 사용
    });
    // ...
  }
);
```

### 방법 2: 환경 변수로 설정 (간단하지만 보안 수준 낮음)

Firebase Console에서 환경 변수로 설정:
1. Firebase Console → Functions → Configuration
2. Environment variables 탭
3. `OPENAI_API_KEY` 추가

이 경우 `process.env.OPENAI_API_KEY`로 바로 사용 가능하지만, Secret Manager보다 보안 수준이 낮습니다.

## 🔧 현재 코드 수정 필요 사항

### 1. routeVoiceCommand.ts
```typescript
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const openaiApiKey = defineSecret("OPENAI_API_KEY");

export const routeVoiceCommand = onCall(
  {
    secrets: [openaiApiKey],
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

### 2. voiceAnalyticsAssistant.ts
동일한 방식으로 수정 필요

### 3. 기타 OpenAI를 사용하는 모든 함수들
- analyzeProduct.ts
- voiceAdminConsole.ts
- teamVoiceAgent.ts
- 등등...

## 🚀 빠른 해결 (임시)

Functions가 많아서 모두 수정하는 데 시간이 걸리므로, **먼저 환경 변수로 설정**하고 나중에 Secret으로 전환하는 것을 권장합니다:

### Step 1: Firebase Console에서 환경 변수 설정
1. Firebase Console 접속
2. Functions → Configuration → Environment variables
3. `OPENAI_API_KEY` 추가
4. Value에 OpenAI API Key 입력

### Step 2: Secret Manager에 등록
```bash
firebase functions:secrets:set OPENAI_API_KEY
```

### Step 3: Functions 재배포
```bash
firebase deploy --only functions
```

## 📝 Secret vs Environment Variable

### Secret Manager (권장)
- ✅ 더 안전함 (자동 암호화)
- ❌ 각 함수마다 선언 필요
- ❌ 코드 수정 필요

### Environment Variable (간단)
- ✅ 코드 수정 불필요
- ✅ 즉시 사용 가능
- ❌ 보안 수준 낮음

## 🔍 현재 코드 확인

### OpenAI를 사용하는 주요 함수들
1. `routeVoiceCommand` - `onCall` 사용
2. `voiceAnalyticsAssistant` - `onCall` 사용
3. `analyzeProduct` - `onRequest` 사용
4. `voiceAdminConsole` - `onCall` 사용
5. `teamVoiceAgent` - `onCall` 사용
6. 기타 여러 함수들...

모두 `secrets: ["OPENAI_API_KEY"]` 선언이 필요합니다.

## ✅ 권장 작업 순서

1. **즉시 해결**: Firebase Console에서 Environment Variable로 설정
2. **함수 재배포**: `firebase deploy --only functions`
3. **확인**: Functions 로그에서 오류 없음 확인
4. **장기적 개선**: 각 함수에 Secret 선언 추가 (선택 사항)

