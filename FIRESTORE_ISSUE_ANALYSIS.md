# 🔍 Firestore 구조 문제 분석

## 📌 현재 화면에서 확인된 정보

### Firestore 구조
- **Association ID**: `RAd4wAbqcsjcVBGLeFiw`
- **Member 문서 ID**: `FhudzMgg9s9pL3HluW4l`
- **Member 필드**:
  - `role`: `"admin"` ✅
  - `status`: `"active"` ✅
  - `joinedAt`: timestamp ✅

### Association 문서 상태
- **"This document has no data"** 표시됨 ❌
- `ownerUid` 필드 없음 ❌
- `name` 필드 없음 ❌

---

## ❌ 발견된 문제점

### 1. Association ID 불일치 (가장 중요)

**화면에 표시된 ID**: `RAd4wAbqcsjcVBGLeFiw`  
**프론트엔드에서 사용하는 ID**: `assoc-nowon-football`

**영향**:
- 프론트엔드가 `assoc-nowon-football`을 찾지만, 실제 데이터는 `RAd4wAbqcsjcVBGLeFiw`에 있음
- 권한 확인 훅들이 잘못된 association을 조회함
- `isOwner: false`, `canPublish: false` 결과 발생

**해결 방법**:
- 프론트엔드가 실제로 사용하는 `associationId` 확인 필요
- 또는 `RAd4wAbqcsjcVBGLeFiw` 문서에 필요한 필드 추가

---

### 2. Association 문서에 필드 없음

**문제**:
- `ownerUid` 필드 없음
- `name` 필드 없음
- 기타 필드 없음

**영향**:
- `useIsAssociationOwner` Hook이 `ownerUid`를 찾지 못함
- `isOwner: false` 결과 발생

**해결 방법**:
- `RAd4wAbqcsjcVBGLeFiw` 문서에 `ownerUid` 필드 추가 필요

---

### 3. 사용자 UID 불일치

**화면의 Member 문서 ID**: `FhudzMgg9s9pL3HluW4l`  
**Auth Emulator의 사용자 UID**: `qGq5XmuXRBsRZOqJFE0yqtZY5Hin`

**영향**:
- 현재 로그인한 사용자(`qGq5XmuXRBsRZOqJFE0yqtZY5Hin`)의 권한 정보가 `FhudzMgg9s9pL3HluW4l` 문서에 있음
- 권한 확인 훅들이 현재 사용자 UID로 members 문서를 찾지 못함
- `canPublish: false` 결과 발생

**해결 방법**:
- `members/qGq5XmuXRBsRZOqJFE0yqtZY5Hin` 문서 생성 필요
- 또는 현재 로그인한 사용자 UID 확인 필요

---

## ✅ 해결 방법

### 방법 1: Association ID 확인 및 통일 (권장)

1. **프론트엔드에서 실제로 사용하는 associationId 확인**
   - 브라우저 콘솔에서 `[TournamentEditDrawer] 권한 확인 상태` 로그 확인
   - `associationId` 값 확인

2. **Association ID 통일**
   - 프론트엔드가 `assoc-nowon-football`을 사용한다면:
     - `assoc-nowon-football` 문서에 `ownerUid` 및 `members` 추가
   - 프론트엔드가 `RAd4wAbqcsjcVBGLeFiw`를 사용한다면:
     - `RAd4wAbqcsjcVBGLeFiw` 문서에 `ownerUid` 추가
     - `members/qGq5XmuXRBsRZOqJFE0yqtZY5Hin` 문서 생성

### 방법 2: 현재 화면의 Association에 데이터 추가

1. **`RAd4wAbqcsjcVBGLeFiw` 문서에 필드 추가**
   - `ownerUid`: `qGq5XmuXRBsRZOqJFE0yqtZY5Hin` (현재 로그인한 사용자 UID)
   - `name`: `"노원구축구협회"` (또는 적절한 이름)

2. **`members/qGq5XmuXRBsRZOqJFE0yqtZY5Hin` 문서 생성**
   - `role`: `"admin"`
   - `status`: `"active"`
   - `joinedAt`: `now`

3. **프론트엔드에서 `associationId`를 `RAd4wAbqcsjcVBGLeFiw`로 변경**
   - 또는 URL 파라미터 확인

---

## 🔍 확인 절차

### 1. 브라우저 콘솔 확인
- F12 → Console
- `[TournamentEditDrawer] 권한 확인 상태` 로그 확인
- `associationId` 값 확인

### 2. URL 확인
- 대회 등록 페이지 URL 확인
- `/association/{associationId}` 경로의 `associationId` 확인

### 3. Firestore 확인
- Emulator UI에서 두 Association 문서 모두 확인:
  - `associations/assoc-nowon-football`
  - `associations/RAd4wAbqcsjcVBGLeFiw`

---

## 💬 요약

**핵심 문제**:
1. Association ID 불일치 (`assoc-nowon-football` vs `RAd4wAbqcsjcVBGLeFiw`)
2. Association 문서에 `ownerUid` 필드 없음
3. 현재 로그인한 사용자 UID와 member 문서 ID 불일치

**해결**:
- 프론트엔드에서 실제로 사용하는 `associationId` 확인 후 해당 문서에 권한 데이터 추가
