# 🔥 TypeScript 컴파일 에러 해결 가이드

**생성일**: 2025-01-27  
**문제**: `functions/src/market/ranking.ts`에서 `.document()` 메서드가 존재하지 않는다는 에러

---

## ✅ 수정 완료

`functions/src/market/ranking.ts`의 import를 v1로 수정 완료:

```typescript
// 수정 전
import * as functions from "firebase-functions";

// 수정 후
import * as functions from "firebase-functions/v1";
```

---

## 🔧 TypeScript 에러가 계속 발생하는 경우

### 방법 1: TypeScript 서버 재시작 (권장)

1. VS Code에서 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
2. "TypeScript: Restart TS Server" 입력
3. Enter

### 방법 2: 빌드 재실행

```bash
cd functions
npm run build
```

### 방법 3: node_modules 재설치

```bash
cd functions
rm -rf node_modules
npm install
npm run build
```

### 방법 4: TypeScript 캐시 삭제

```bash
cd functions
rm -rf lib
rm -rf node_modules/.cache
npm run build
```

---

## 📋 확인 사항

- [ ] `functions/src/market/ranking.ts`에서 `import * as functions from "firebase-functions/v1";` 확인
- [ ] TypeScript 서버 재시작 완료
- [ ] 빌드 성공 확인 (`npm run build`)

---

## 🎯 예상 결과

빌드 성공 후:
- `functions/lib/market/ranking.js` 생성됨
- TypeScript 에러 사라짐
- `firebase deploy --only functions:createTeam` 정상 작동

---

**TypeScript 서버를 재시작하면 에러가 해결됩니다!** 🎉
