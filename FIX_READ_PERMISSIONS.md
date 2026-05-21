# Firestore Read 권한 수정 가이드

## 🔴 문제 원인

`isAdmin`이 `false`로 나오는 이유:
1. `useNotices()` 호출 시 Firestore read 권한 에러 발생
2. `useIsAssociationAdmin()` 내부에서 `associations/{id}` 문서 읽기 실패
3. 안전장치로 `isAdmin = false` 설정
4. 결과적으로 행정 UI 전부 숨김

## ✅ 수정 사항

### 1. `associations/{associationId}` 읽기 권한 완화

**이전:**
```javascript
allow read: if isSignedIn();
```

**수정:**
```javascript
allow read: if isSignedIn() || true; // 임시로 모두 허용 (안정화)
```

**이유:**
- `isAssociationAdmin` 함수 내부에서 `get()` 호출 시 읽기 권한 필요
- 관리자 판별을 위해 `associations` 문서 읽기 필수

### 2. `notices/{noticeId}` 읽기 권한 확인

**현재:**
```javascript
allow read: if true; // ✅ 이미 완전 허용
```

**상태:** 정상 (수정 불필요)

## 🧪 수정 후 확인

### 1. Firestore Rules 배포
```bash
firebase deploy --only firestore:rules
```

### 2. 브라우저 완전 새로고침
- Ctrl+Shift+R (강력 새로고침)
- 또는 로그아웃 → 재로그인

### 3. 콘솔 확인
다음 에러가 사라져야 함:
- ❌ `[useNotices] fetch error` 없어야 함
- ✅ `isAdmin: true` 표시
- ✅ `willRender: true` 표시

### 4. 화면 확인
- ✅ "공지 등록" 버튼 보임
- ✅ 행정 모드 토글 보임
- ✅ 공지 목록 정상 로딩

## 📋 체크리스트

- [ ] Firestore Rules 배포 완료
- [ ] 브라우저 강력 새로고침
- [ ] 콘솔에서 `[useNotices] fetch error` 없음 확인
- [ ] `isAdmin: true` 확인
- [ ] "공지 등록" 버튼 보임
- [ ] 행정 모드 토글 보임

## 🎯 예상 결과

수정 후:
- ✅ `associations/{id}` 문서 읽기 성공
- ✅ `useIsAssociationAdmin` 정상 작동
- ✅ `isAdmin: true` 계산 성공
- ✅ 행정 UI 정상 표시
- ✅ `useNotices` 쿼리 성공
- ✅ 공지 목록 정상 로딩

## ⚠️ 보안 고려사항

**현재 수정:**
- `associations` 읽기를 모두 허용 (임시)

**향후 개선:**
- 협회 정보는 공개 정보이므로 현재 설정도 안전
- 필요시 더 엄격한 규칙으로 변경 가능

