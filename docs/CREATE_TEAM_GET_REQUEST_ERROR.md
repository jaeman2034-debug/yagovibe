# 🔥 createTeam GET 요청 에러 해결

**생성일**: 2025-01-27  
**목적**: GET 요청 에러 해결 및 CORS 설정  
**상태**: ✅ CORS 설정 추가 완료

---

## 🔴 발견된 문제

### 로그 분석 결과

```
2026-01-16T10:05:03.919410Z W createteam: Request has invalid method. GET
2026-01-16T10:05:03.920257Z E createteam: Error: Invalid request, unable to process.
```

**문제점**:
- `onCall` 함수는 **POST 요청**만 받아야 함
- **GET 요청**이 들어오고 있음
- CORS preflight 요청이 실패하거나 잘못된 방식으로 호출됨

---

## ✅ 해결 방법

### CORS 설정 추가

다른 `onCall` 함수들은 모두 `cors: true`를 설정하고 있습니다:

```typescript
// ✅ 다른 함수들 (정상)
export const pingCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true, // ✅ CORS 활성화
  },
  ...
);
```

하지만 `createTeam`은 `cors: true`가 없었습니다:

```typescript
// ❌ 수정 전
export const createTeam = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
    // ❌ cors: true 없음
  },
  ...
);
```

---

## ✅ 수정 완료

```typescript
// ✅ 수정 후
export const createTeam = onCall(
  {
    region: "asia-northeast3",
    cors: true, // 🔥 CORS 활성화 (GET 요청 에러 방지)
    maxInstances: 10,
  },
  ...
);
```

---

## 🎯 효과

### Before (CORS 없음)
- GET 요청 에러 발생
- CORS preflight 실패 가능
- 프론트엔드에서 호출 실패

### After (CORS 활성화)
- CORS preflight 요청 정상 처리
- POST 요청만 허용
- 프론트엔드에서 정상 호출 가능

---

## 📋 다음 단계

1. ✅ CORS 설정 추가 완료
2. ⏳ Functions 배포: `firebase deploy --only functions:createTeam`
3. ⏳ 팀 생성 테스트
4. ⏳ Functions 로그 확인

---

**작성일**: 2025-01-27  
**상태**: ✅ CORS 설정 추가 완료  
**다음 단계**: Functions 배포 및 테스트
