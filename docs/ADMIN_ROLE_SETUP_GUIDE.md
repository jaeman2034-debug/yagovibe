# 🔥 관리자 Role 설정 가이드

## 📋 목표

Firebase Console에서 `users/{uid}` 문서에 `role: "ADMIN"` 필드를 추가하여 관리자 권한을 부여합니다.

---

## 🔍 STEP 1: 현재 사용자 UID 확인

### 방법 A: 브라우저 콘솔에서 확인

1. `/app/admin/dashboard` 접속
2. 브라우저 개발자 도구 열기 (F12)
3. Console 탭에서 다음 로그 확인:

```
🔍 [AdminRoute] 권한 체크: {
  userId: "여기가_당신의_UID",  ← 이 값을 복사
  role: undefined,
  isAdmin: false
}
```

### 방법 B: AdminRoute 로그에서 직접 확인

브라우저 콘솔에 다음 코드 입력:

```javascript
// 현재 로그인한 사용자 UID 확인
import { auth } from '/src/lib/firebase.js';
console.log('현재 사용자 UID:', auth.currentUser?.uid);
```

---

## 🔧 STEP 2: Firebase Console에서 Role 추가

### 1. Firebase Console 접속

```
https://console.firebase.google.com
```

### 2. 프로젝트 선택

- YAGO VIBE 프로젝트 선택

### 3. Firestore Database 열기

- 왼쪽 메뉴에서 **"Firestore Database"** 클릭
- 또는 **"Build"** → **"Firestore Database"**

### 4. users 컬렉션 열기

- `users` 컬렉션 클릭
- 문서 목록에서 **{당신의 UID}** 문서 찾기
- 문서 클릭하여 열기

### 5. role 필드 추가

1. 문서 상단의 **"필드 추가"** 버튼 클릭
2. 필드 설정:
   - **필드명**: `role`
   - **타입**: `string` (문자열)
   - **값**: `ADMIN` (대문자 정확히)
3. **저장** 클릭

### ⚠️ 주의사항

- ✅ 대문자 정확히: `"ADMIN"` (소문자 `"admin"`도 작동하지만 대문자 권장)
- ✅ 문자열 타입 (배열 아님)
- ✅ 루트 레벨에 추가 (서브컬렉션 안에 넣지 말 것)
- ✅ 기존 필드와 같은 레벨에 추가

---

## 🚀 STEP 3: Firestore Rules 배포

### 방법 A: Firebase CLI 사용

```bash
firebase deploy --only firestore:rules
```

### 방법 B: Firebase Console에서 직접 배포

1. Firebase Console → Firestore Database
2. **"Rules"** 탭 클릭
3. 수정된 rules 확인
4. **"게시"** 버튼 클릭

---

## ✅ STEP 4: 검증

### 1. 브라우저 새로고침

- `/app/admin/dashboard` 페이지 새로고침 (F5)

### 2. 콘솔 로그 확인

다음 로그가 보여야 합니다:

```
🔍 [AdminRoute] 권한 체크: {
  userId: "...",
  role: "ADMIN",  ← 이제 값이 있어야 함
  isAdmin: true   ← 이제 true여야 함
}

✅ [AdminDashboard] 유저 목록 구독 성공: X명
✅ [AdminDashboard] 인증 로그 구독 성공: X개
```

### 3. 화면 확인

- AdminDashboard에서 users 데이터 표시
- SMS 로그 표시
- `FirebaseError: Missing or insufficient permissions` 에러 사라짐

---

## 🐛 문제 해결

### 문제 1: role 추가 후에도 여전히 권한 오류

**해결 방법:**
1. Firestore Rules가 배포되었는지 확인
2. 브라우저 캐시 삭제 후 새로고침
3. 로그아웃 후 다시 로그인

### 문제 2: role 필드가 보이지 않음

**해결 방법:**
1. 문서를 다시 열어서 확인
2. 필드 타입이 `string`인지 확인
3. 값이 정확히 `"ADMIN"`인지 확인 (따옴표 포함)

### 문제 3: AdminRoute에서 여전히 `role: undefined`

**해결 방법:**
1. `useAuthUser` Hook이 프로필을 제대로 로드하는지 확인
2. 브라우저 콘솔에서 다음 확인:

```javascript
// 프로필 데이터 확인
const { profile } = useAuthUser();
console.log('프로필 role:', profile?.role);
```

---

## 📝 완료 체크리스트

- [ ] 현재 사용자 UID 확인
- [ ] Firebase Console에서 `users/{uid}` 문서 열기
- [ ] `role: "ADMIN"` 필드 추가
- [ ] Firestore Rules 배포
- [ ] 브라우저 새로고침
- [ ] AdminRoute 로그에서 `role: "ADMIN"` 확인
- [ ] AdminDashboard에서 데이터 로딩 확인

---

## 🎯 다음 단계

role 추가 완료 후:
1. CTR 계산 쿼리 검증
2. DAU 집계 확인
3. 이벤트 파이프라인 검증
4. 실데이터 기준 재설계
