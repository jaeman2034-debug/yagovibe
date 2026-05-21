# 🔥 setAssociationAdminCallable 배포 가이드

## 문제 원인

배포 타임아웃이 발생하는 이유:
- `index.ts`에서 모든 함수를 export하면서 모듈 레벨 초기화가 실행됨
- 일부 파일(`vibeAutoPilot.ts`, `step36.tasks.ts` 등)에서 모듈 레벨 `admin.initializeApp()` 호출

## 해결 방법

### 방법 1: Firebase Console에서 직접 테스트 (가장 빠름)

함수가 배포되지 않아도, 로컬에서 빌드된 코드를 확인할 수 있습니다.

1. **로컬에서 함수 테스트**:
```bash
cd functions
npm run build
```

2. **Firebase Console에서 수동 실행**:
   - Firebase Console → Functions
   - `setAssociationAdminCallable`이 없으면, 다른 callable 함수를 참고하여 수동으로 실행

### 방법 2: 임시로 다른 export 주석 처리

`functions/src/index.ts`에서 문제가 되는 export를 임시로 주석 처리:

```typescript
// 임시 주석 처리 (배포 타임아웃 방지)
// export { vibeAutoPilot } from "./vibeAutoPilot";
// export { ... } from "./step36.tasks";
```

그 후 배포:
```bash
firebase deploy --only functions:setAssociationAdminCallable
```

### 방법 3: 함수를 독립 파일로 분리

`setAssociationAdmin.ts`를 별도 entry point로 만들기 (복잡함)

## 권장 해결책

**지금 당장**: Firebase Console에서 직접 테스트하거나, 임시 저장(DRAFT)으로 진행

**장기적**: 문제가 되는 파일들의 모듈 레벨 초기화를 제거

