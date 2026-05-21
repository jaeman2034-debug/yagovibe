# useNotices 쿼리 인덱스 생성 가이드

## 🔴 문제 원인

`useNotices` 쿼리가 실패하는 이유:
- 복합 쿼리(`where` + `orderBy`) 사용
- Firestore 인덱스가 없으면 쿼리 실패
- 쿼리 실패 → `isAdmin` 계산 실패 → 행정 UI 숨김

## 📋 필요한 인덱스

### 인덱스 1: 일반 모드 (published만)
```
컬렉션: notices
필드:
  - status (Ascending)
  - associationId (Ascending)
  - isPinned (Descending)
  - createdAt (Descending)
```

### 인덱스 2: 관리자 모드 (draft 포함)
```
컬렉션: notices
필드:
  - associationId (Ascending)
  - isPinned (Descending)
  - createdAt (Descending)
```

## ✅ 인덱스 생성 방법

### 방법 1: 자동 생성 (권장)

1. **브라우저 콘솔에서 에러 확인**
   - `useNotices` 쿼리 실행 시 에러 발생
   - 에러 메시지에 **인덱스 생성 링크** 포함

2. **링크 클릭**
   - Firebase Console → Firestore → Indexes 탭으로 이동
   - 인덱스 자동 생성됨

3. **인덱스 생성 완료 대기**
   - 보통 1~5분 소요
   - "Enabled" 상태가 되면 사용 가능

### 방법 2: 수동 생성

1. **Firebase Console → Firestore → Indexes 탭**
2. **"+ 인덱스 만들기" 클릭**
3. **컬렉션 ID:** `notices`
4. **필드 추가:**
   - `status` (Ascending)
   - `associationId` (Ascending)
   - `isPinned` (Descending)
   - `createdAt` (Descending)
5. **쿼리 범위:** 컬렉션
6. **만들기** 클릭

## 🧪 인덱스 생성 후 확인

### 1. 인덱스 상태 확인
- Firebase Console → Firestore → Indexes 탭
- 생성한 인덱스가 **"Enabled"** 상태인지 확인

### 2. 브라우저 테스트
- 브라우저 강력 새로고침 (Ctrl+Shift+R)
- 공지 목록 페이지 진입
- 콘솔에서 `[useNotices] fetch error` 없음 확인

### 3. 쿼리 성공 확인
- 공지 목록이 정상적으로 로딩됨
- `isAdmin: true` 표시
- 행정 UI 정상 표시

## 📝 체크리스트

- [ ] 인덱스 생성 완료 (Enabled 상태)
- [ ] 브라우저 강력 새로고침
- [ ] `[useNotices] fetch error` 없음 확인
- [ ] 공지 목록 정상 로딩
- [ ] `isAdmin: true` 확인
- [ ] 행정 UI 정상 표시

## 🎯 예상 결과

인덱스 생성 후:
- ✅ `useNotices` 쿼리 성공
- ✅ 공지 목록 정상 로딩
- ✅ `isAdmin` 계산 성공
- ✅ 행정 UI 정상 표시
- ✅ "공지 등록" 버튼 보임

## ⚠️ 참고

**인덱스 생성은 시간이 걸립니다:**
- 보통 1~5분 소요
- 대용량 데이터는 더 오래 걸릴 수 있음
- 생성 완료 전까지는 쿼리 실패

**인덱스 생성 중:**
- "Building" 상태 표시
- 쿼리는 여전히 실패
- 생성 완료 후 자동으로 작동

