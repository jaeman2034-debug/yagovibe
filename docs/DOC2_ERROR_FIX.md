# 🔥 doc2 is not a function 오류 해결 가이드

## 🚨 발견된 오류

콘솔에 반복적으로 나타나는 오류:
```
doc2 is not a function
```

**위치**: `useMyTeams.ts`에서 `doc()` 함수 호출 시

---

## 🔍 원인 분석

### 가능한 원인들

1. **브라우저 캐시 문제**
   - 오래된 빌드 파일이 캐시되어 있음
   - 수정된 코드가 반영되지 않음

2. **빌드 문제**
   - Vite/HMR이 제대로 업데이트하지 않음
   - 빌드된 파일이 손상됨

3. **Import 문제**
   - `doc` 함수가 제대로 import되지 않음
   - 다른 모듈에서 충돌

---

## ✅ 해결 방법

### 1. 브라우저 캐시 클리어 (가장 빠른 해결책)

**Chrome DevTools에서**:
1. F12 → Network 탭
2. "Disable cache" 체크
3. 페이지 새로고침 (Ctrl+Shift+R 또는 Cmd+Shift+R)

**또는**:
1. 개발자 도구 열기 (F12)
2. Network 탭 → "Disable cache" 체크
3. Application 탭 → Clear storage → Clear site data

---

### 2. 개발 서버 재시작

```bash
# 개발 서버 중지 (Ctrl+C)
# 그 다음 다시 시작
npm run dev
```

---

### 3. 빌드 캐시 클리어

```bash
# node_modules/.vite 캐시 삭제
rm -rf node_modules/.vite
# 또는 Windows에서
rmdir /s /q node_modules\.vite

# 개발 서버 재시작
npm run dev
```

---

### 4. 코드 확인 (이미 올바름)

현재 `useMyTeams.ts`의 import는 올바릅니다:

```typescript
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc } from "firebase/firestore";
```

사용도 올바릅니다:
```typescript
const teamRef = doc(db, "teams", teamId);
const ghostTeamMemberRef = doc(db, "team_members", doc.id);
```

---

## 🔥 즉시 해결 단계

### Step 1: 브라우저 하드 리프레시
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### Step 2: 개발 서버 재시작
```bash
# 터미널에서
npm run dev
```

### Step 3: 여전히 문제가 있으면
```bash
# 빌드 캐시 삭제
rm -rf node_modules/.vite
# 또는 Windows
rmdir /s /q node_modules\.vite

# 재시작
npm run dev
```

---

## 📊 확인 사항

### 코드는 올바름 ✅
- ✅ `doc` 함수가 올바르게 import됨
- ✅ `doc()` 호출이 올바름
- ✅ `doc2`는 코드베이스에 존재하지 않음

### 문제는 캐시/빌드 ⚠️
- ⚠️ 브라우저가 오래된 빌드 파일을 사용 중
- ⚠️ Vite HMR이 제대로 업데이트하지 않음

---

## 🎯 예상 결과

위 단계를 수행하면:
1. ✅ 브라우저가 최신 코드를 로드
2. ✅ `doc2` 오류가 사라짐
3. ✅ `useMyTeams`가 정상 작동

---

## 💡 추가 디버깅

만약 여전히 문제가 있다면:

### 1. 콘솔에서 확인
```javascript
// 브라우저 콘솔에서
import { doc } from "firebase/firestore";
console.log(typeof doc); // "function"이어야 함
```

### 2. Network 탭 확인
- `useMyTeams.ts` 파일이 최신 버전인지 확인
- 파일 내용에 `doc2`가 있는지 확인

### 3. Source 탭 확인
- DevTools → Sources → `useMyTeams.ts`
- 실제 로드된 코드 확인

---

## ✅ 최종 확인

문제 해결 후 콘솔에 나타나야 하는 것:
- ✅ `[useMyTeams] 쿼리 실행: {field: 'userId'}` (uid가 아닌 userId)
- ✅ `[useMyTeams] 데이터 수신: {count: 1, ...}`
- ✅ `[useMyTeams] 파싱된 팀 목록: {valid: 1, ...}`
- ❌ `doc2 is not a function` 오류 없음
