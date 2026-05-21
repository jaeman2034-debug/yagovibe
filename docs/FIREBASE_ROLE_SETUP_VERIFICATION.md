# 🔥 Firebase Role 필드 확인 및 추가 가이드

## 📋 현재 문제

콘솔 로그:
```json
[AdminRoute] 권한 체크: {
  role: undefined,  ← 이게 문제
  isAdmin: false
}
```

**원인**: `users/{uid}` 문서에 `role: "ADMIN"` 필드가 없음

---

## ✅ 해결 방법

### STEP 1: Firebase Console 접속

1. https://console.firebase.google.com 접속
2. 프로젝트 선택: `yago-vibe-spt`
3. 왼쪽 메뉴: **Firestore Database** 클릭

### STEP 2: users 컬렉션 열기

1. `users` 컬렉션 클릭
2. 문서 목록에서 **{당신의 uid}** 문서 찾기
   - uid는 콘솔 로그에서 확인: `userId: "uUZB8RjKLEhb3uotZ6yqtpWtUQE2"` (예시)
3. 해당 문서 클릭하여 열기

### STEP 3: role 필드 확인

문서를 열었을 때 다음 필드들이 보여야 합니다:

```
users/{uid}
├── phone: "010-1234-5678"
├── displayName: "..."
├── onboardingCompleted: true/false
├── role: "ADMIN"  ← 이게 있어야 함!
└── ... (기타 필드)
```

**만약 `role` 필드가 없다면:**

### STEP 4: role 필드 추가

1. 문서 상단의 **"필드 추가"** 버튼 클릭
2. 필드 설정:
   - **필드명**: `role`
   - **타입**: `string` (문자열)
   - **값**: `ADMIN` (대문자 정확히)
3. **저장** 클릭

### STEP 5: 검증

1. 브라우저에서 **로그아웃** → **로그인** (또는 F5 강력 새로고침)
2. `/app/admin/dashboard` 접속
3. 브라우저 콘솔 확인:

```
🔍 [AdminRoute] 권한 체크: {
  userId: "...",
  role: "ADMIN",  ← 이제 값이 있어야 함
  isAdmin: true   ← 이제 true여야 함
}

✅ [AdminDashboard] 유저 목록 구독 성공: X명
✅ [AdminDashboard] 인증 로그 구독 성공: X개
```

---

## ⚠️ 주의사항

1. **대문자 정확히**: `"ADMIN"` (소문자 `"admin"`도 작동하지만 대문자 권장)
2. **문자열 타입**: 배열이나 객체가 아님
3. **루트 레벨**: 서브컬렉션 안에 넣지 말 것
4. **정확한 uid**: 로그인한 사용자의 uid와 일치해야 함

---

## 🔍 uid 확인 방법

### 방법 1: 브라우저 콘솔

```javascript
// 콘솔에 입력
import { auth } from '/src/lib/firebase.js';
console.log('현재 사용자 UID:', auth.currentUser?.uid);
```

### 방법 2: AdminRoute 로그

브라우저 콘솔에서:
```
🔍 [AdminRoute] 권한 체크: {
  userId: "여기가_당신의_UID"
}
```

### 방법 3: Firebase Console → Authentication

1. Firebase Console → Authentication
2. Users 탭
3. 로그인한 사용자 찾기
4. UID 복사

---

## 🐛 문제 해결

### 문제 1: role 추가 후에도 여전히 `undefined`

**해결 방법:**
1. 브라우저 캐시 삭제 후 새로고침
2. 로그아웃 → 로그인
3. `useAuthUser` Hook이 프로필을 다시 로드하는지 확인

### 문제 2: role 필드가 보이지 않음

**해결 방법:**
1. 문서를 다시 열어서 확인
2. 필드 타입이 `string`인지 확인
3. 값이 정확히 `"ADMIN"`인지 확인 (따옴표 포함)

### 문제 3: 다른 uid 문서에 추가했음

**해결 방법:**
1. 현재 로그인한 사용자의 정확한 uid 확인
2. 해당 uid 문서에 role 필드 추가

---

## 📝 완료 체크리스트

- [ ] Firebase Console에서 `users/{uid}` 문서 열기
- [ ] `role` 필드 존재 여부 확인
- [ ] 없으면 `role: "ADMIN"` 필드 추가
- [ ] 브라우저 로그아웃 → 로그인
- [ ] `/app/admin/dashboard` 접속
- [ ] 콘솔에서 `role: "ADMIN"` 확인
- [ ] `isAdmin: true` 확인
- [ ] AdminDashboard에서 데이터 로딩 확인

---

## 🎯 다음 단계

role 필드 추가 완료 후:
1. CTR 계산 쿼리 검증
2. DAU 집계 확인
3. 이벤트 파이프라인 검증
4. 실데이터 기준 재설계
