# 🔥 Firestore Security Rules 패치 검토 및 적용

## ✅ 검토 결과

제공된 패치를 검토한 결과, **대부분 올바르지만 몇 가지 수정이 필요**합니다.

### 발견된 문제점

1. **`changedKeys()` 메서드 오류**
   - ❌ 제공된 패치: `changedKeys()`
   - ✅ 올바른 메서드: `affectedKeys()`
   - Firestore rules v2에서는 `diff().affectedKeys()`가 올바른 메서드입니다.

2. **함수 이름 충돌**
   - 기존: `isOwner(associationId)`, `isAdmin(associationId)` (협회용)
   - 제공된 패치: `isOwner(uid)`, `isAdmin()` (전역 관리자)
   - 해결: `isUserOwner(uid)` 추가, `isGlobalAdmin()` 사용

3. **Users 컬렉션 읽기 정책**
   - 제공된 패치: `allow read: if signedIn()` (모든 로그인 사용자)
   - 현재: `allow get: if request.auth != null && request.auth.uid == userId` (본인만)
   - 선택: 공개 프로필 vs 본인만 (서비스 정책에 따라 결정)

## 📝 적용된 수정사항

### 1. Users 컬렉션
- ✅ 읽기: 로그인 사용자 모두 가능 (공개 프로필)
- ✅ 생성: 본인만 (`isUserOwner(userId)`)
- ✅ 수정: 본인이 직접 바꿔도 되는 필드만 제한
  - 허용 필드: `displayName`, `photoURL`, `recentSports`, `recentCategories`, `lastSeenAtBySport`, `fcmTokens`, `lastLoginAt`
- ✅ trustScore/riskScore: 관리자만 수정 가능
- ✅ 삭제: 금지

### 2. Market Posts 컬렉션
- ✅ 읽기: 로그인 사용자 모두 가능
- ✅ 생성: `authorId == uid`인 경우만
- ✅ 수정: 작성자만 (콘텐츠 필드)
- ✅ metrics 필드: 임시 허용 (v1 - 향후 CF로 이동)
- ✅ 거래 완료: 판매자만 가능
- ✅ 리스크/섀도우밴: 관리자만
- ✅ 삭제: 관리자만

### 3. Market Reviews 컬렉션 (추가)
- ✅ 읽기: 로그인 사용자 모두 가능
- ✅ 생성: `buyerId == uid`인 경우만
- ✅ 수정/삭제: 관리자만

### 4. Notifications 컬렉션
- ✅ 읽기: 본인만
- ✅ 수정: 본인만 (read 필드만)
- ✅ 생성: v1 임시 허용 (필드 제한)
  - 필수 필드: `userId`, `type`, `message`, `read`, `createdAt`
  - `read == false` 강제
- ✅ 삭제: 관리자만

### 5. Chat Rooms 컬렉션
- ✅ 읽기: 로그인 사용자 모두 가능 (대시보드 count용)

## ⚠️ 주의사항

### 1. `changedKeys()` → `affectedKeys()` 수정 필요
제공된 패치의 모든 `changedKeys()`를 `affectedKeys()`로 변경했습니다.

### 2. Users 읽기 정책
현재는 **공개 프로필**로 설정했습니다. 만약 **본인만** 읽기 가능하게 하려면:
```javascript
allow read: if signedIn() && request.auth.uid == userId;
```

### 3. Notifications 생성
현재는 클라이언트에서 생성 가능하지만, **최종적으로는 Cloud Functions로 이동** 권장합니다.

### 4. Metrics 필드
`views`, `likesCount`, `chatCount`, `rankScore`는 **임시 허용**입니다. 향후 Cloud Functions로 이동해야 합니다.

## ✅ 배포 완료

```bash
firebase deploy --only firestore:rules
```

**배포 성공!** 모든 규칙이 적용되었습니다.

---

**Firestore Security Rules 패치 검토 및 적용 완료!** 🎉
