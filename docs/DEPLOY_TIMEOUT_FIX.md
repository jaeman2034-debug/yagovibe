# 🔥 배포 타임아웃 해결 가이드

**생성일**: 2025-01-27  
**문제**: "User code failed to load. Cannot determine backend specification. Timeout after 10000."

---

## 🔴 문제 원인

`functions/src/index.ts`에서 모든 함수를 한 번에 import하면서:
- `onMarketJoinStatusChanged`가 여러 무거운 모듈을 import
- `firebaseAdmin.ts`, `regionRouter.ts`, `auditLog.ts` 등이 top-level에서 초기화
- 초기화 시간이 10초를 초과하여 타임아웃 발생

---

## ✅ 해결 방법

### 방법 1: createTeam만 별도 배포 (권장)

`createTeam`은 다른 함수들과 독립적이므로 별도로 배포 가능합니다.

#### 1단계: createTeam만 export하는 임시 index 파일 생성

`functions/src/createTeamOnly.ts`:

```typescript
// 🔥 createTeam 전용 배포 파일
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export { createTeam } from "./createTeam";
```

#### 2단계: firebase.json 수정

```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
    },
    {
      "source": "functions",
      "codebase": "createTeam",
      "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"],
      "runtime": "nodejs20"
    }
  ]
}
```

#### 3단계: 별도 배포

```bash
firebase deploy --only functions:createTeam --codebase createTeam
```

---

### 방법 2: index.ts에서 무거운 import 제거 (간단)

`index.ts`에서 top-level Admin 초기화를 제거하고, 각 함수에서 지연 초기화하도록 변경:

```typescript
// ❌ 제거
// import * as admin from "firebase-admin";
// if (admin.apps.length === 0) {
//   admin.initializeApp();
// }

// ✅ 각 함수에서 지연 초기화
export { createTeam } from "./createTeam";
```

---

### 방법 3: createTeam만 배포 (가장 빠름)

`index.ts`에서 `createTeam` export만 남기고 나머지는 주석 처리:

```typescript
// 🔥 createTeam만 배포
export { createTeam } from "./createTeam";

// 나머지는 주석 처리
// export { onMarketJoinStatusChanged } from "./market/onMarketJoinStatusChanged";
// export { onChatRoomCreated, onMarketPostCreated } from "./market/ranking";
```

그 후 배포:

```bash
firebase deploy --only functions:createTeam
```

---

## 🎯 권장 해결 순서

1. **방법 3 시도** (가장 빠름)
   - `index.ts`에서 `createTeam`만 export
   - 배포 후 다른 함수들 다시 활성화

2. **방법 2 적용** (근본 해결)
   - top-level 초기화 제거
   - 각 함수에서 지연 초기화

3. **방법 1 적용** (장기적)
   - codebase 분리로 독립 배포

---

## 📋 수정 완료 사항

- ✅ `createTeam.ts`: `auditLog` 지연 import로 변경
- ✅ `index.ts`: top-level Admin 초기화 주석 처리
- ✅ 빌드 성공 확인

---

**이제 배포를 다시 시도해보세요!** 🚀
