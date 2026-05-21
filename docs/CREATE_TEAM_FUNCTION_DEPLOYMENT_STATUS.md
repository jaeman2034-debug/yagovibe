# 🔥 createTeam 함수 배포 및 호출 상태 확인

**생성일**: 2025-01-27  
**목적**: createTeam 함수 배포 및 호출 문제 진단  
**상태**: ✅ 배포 완료, ❌ 호출 안 됨

---

## ✅ 배포 상태 확인

### Google Cloud Logging 확인 결과

1. **함수 배포 확인**: ✅
   - `createTeam` 함수가 `asia-northeast3`에 배포됨
   - 배포 시간: 18:55:35, 18:58:21

2. **Cloud Run 서비스 준비**: ✅
   - `createteam` 서비스가 Ready 상태
   - URL: `https://createteam-xxxxx-du.a.run.app`

3. **실행 로그**: ❌
   - `[createTeam] called` 로그 없음
   - 함수가 실제로 호출되지 않음

---

## ✅ 코드 확인 결과

### 1. 백엔드 (정상)

```typescript
// functions/src/createTeam.ts
export const createTeam = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<CreateTeamResponse> => {
    // ...
  }
);
```

```typescript
// functions/src/index.ts
export { createTeam } from "./createTeam";
```

### 2. 프론트엔드 (정상)

```typescript
// src/lib/firebase.ts
functions = getFunctions(app, "asia-northeast3");
```

```typescript
// src/pages/team/TeamCreateForm.tsx
import { functions } from "@/lib/firebase";
const createTeamCallable = httpsCallable(functions, "createTeam");
```

---

## 🔍 가능한 원인

### 1. v2 Functions 이름 변환

Firebase Functions v2는 함수 이름을 소문자로 변환할 수 있습니다:
- 정의: `createTeam`
- 실제 URL: `createteam`

하지만 `httpsCallable`은 원래 이름(`createTeam`)을 사용해야 합니다.

### 2. 네트워크 요청 실패

프론트엔드에서 실제로 HTTP 요청이 전송되지 않았을 수 있습니다:
- CORS 문제
- 네트워크 에러
- 인증 문제

### 3. 에러가 조용히 무시됨

에러가 발생했지만 catch 블록에서 제대로 처리되지 않았을 수 있습니다.

---

## ✅ 해결 방법

### 1. 프론트엔드 디버깅 로그 추가

`TeamCreateForm.tsx`에 상세 로그 추가 완료:
- Functions 객체 확인
- 함수 호출 전/후 로그
- 에러 상세 로그

### 2. 브라우저 콘솔 확인

팀 생성 시도 시 브라우저 콘솔에서:
- `[TeamCreateForm]` 로그 확인
- 네트워크 탭에서 HTTP 요청 확인
- 에러 메시지 확인

### 3. Functions 로그 실시간 확인

```bash
firebase functions:log --only createTeam -n 20
```

또는 Google Cloud Logging에서 실시간 확인

---

## 📋 체크리스트

- [x] 함수 배포 확인
- [x] index.ts export 확인
- [x] 프론트엔드 호출 코드 확인
- [x] region 일치 확인
- [x] 디버깅 로그 추가
- [ ] 실제 호출 테스트
- [ ] 브라우저 콘솔 확인
- [ ] Functions 로그 확인

---

**작성일**: 2025-01-27  
**상태**: ✅ 배포 완료, 🔍 호출 문제 진단 중  
**다음 단계**: 실제 호출 테스트 및 브라우저 콘솔 확인
