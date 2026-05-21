# 🚨 ID 불일치 문제 확인

## 📌 현재 상황

### 화면에 표시된 ID
- **Association ID**: `RAd4wAbqcsjcVBGLeFiw` ❌
- **Member 문서 ID**: `FhudzMgg9s9pL3HluW4l` ❌

### 스크립트로 추가한 ID
- **Association ID**: `assoc-nowon-football` ✅
- **Member 문서 ID**: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` ✅

### Auth Emulator의 사용자 UID
- **사용자 UID**: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` ✅

---

## ❌ 문제점

1. **Association ID 불일치**
   - 화면: `RAd4wAbqcsjcVBGLeFiw`
   - 스크립트: `assoc-nowon-football`
   - 프론트엔드: `assoc-nowon-football` (URL 기준)

2. **Member 문서 ID 불일치**
   - 화면: `FhudzMgg9s9pL3HluW4l`
   - 스크립트: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`
   - Auth Emulator: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`

---

## ✅ 해결 방법

### 방법 1: 올바른 Association에 데이터 추가 (권장)

프론트엔드가 실제로 사용하는 Association ID를 확인하고 해당 ID에 데이터를 추가해야 합니다.

#### STEP 1: 프론트엔드에서 사용하는 Association ID 확인

브라우저 콘솔에서:
```javascript
// URL에서 확인
console.log('URL의 associationId:', window.location.pathname.split('/')[2]);

// 또는 TournamentEditDrawer에서 확인
// 콘솔 로그에서 associationId 값 확인
```

#### STEP 2: 올바른 Association ID에 데이터 추가

확인된 Association ID에 맞춰 스크립트 수정:

```javascript
// 만약 프론트엔드가 RAd4wAbqcsjcVBGLeFiw를 사용한다면:
const ASSOCIATION_ID = "RAd4wAbqcsjcVBGLeFiw";
const ADMIN_UID = "qGq5XmuXRBsRZ0qJFE0yqtZY5Hin"; // Auth Emulator의 실제 UID
```

---

### 방법 2: 두 Association 모두에 데이터 추가

두 Association ID 모두에 데이터를 추가하는 방법:

1. `assoc-nowon-football` (프론트엔드 URL 기준)
2. `RAd4wAbqcsjcVBGLeFiw` (화면에 표시된 ID)

---

## 🔍 확인 절차

### 1. 프론트엔드에서 실제로 사용하는 Association ID 확인

브라우저 URL 확인:
- 현재 URL: `https://localhost:5173/association/assoc-nowon-football`
- Association ID: `assoc-nowon-football` ✅

콘솔 로그 확인:
- `[TournamentEditDrawer] 권한 확인 상태` 로그에서 `associationId` 값 확인

### 2. Auth Emulator에서 실제 사용자 UID 확인

1. `http://localhost:4001` → Authentication → Users
2. 현재 로그인한 사용자 UID 확인
3. Member 문서 ID는 이 UID와 일치해야 함

### 3. Firestore Emulator에서 데이터 확인

1. `http://localhost:4001` → Firestore
2. `associations/assoc-nowon-football` 문서 확인
3. `associations/RAd4wAbqcsjcVBGLeFiw` 문서 확인
4. 각각의 `members` 서브컬렉션 확인

---

## 💬 요약

**문제**: 
- 화면에 표시된 Association ID (`RAd4wAbqcsjcVBGLeFiw`)와 스크립트로 추가한 ID (`assoc-nowon-football`)가 다름
- Member 문서 ID도 다름

**해결**:
1. 프론트엔드에서 실제로 사용하는 Association ID 확인
2. 해당 Association ID에 맞춰 데이터 추가
3. 또는 두 Association 모두에 데이터 추가

**확인 필요**:
- 브라우저 URL의 Association ID
- 콘솔 로그의 `associationId` 값
- Auth Emulator의 실제 사용자 UID
