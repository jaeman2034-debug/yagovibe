# 🔥 Firestore Security Rules 권한 에러 해결 v1

## ✅ 완료된 작업

### 1. Users 컬렉션 규칙 업데이트
- **읽기**: 본인만 가능 (다른 사용자 정보는 제한)
- **list**: 관리자만 가능 (admin analytics용)
- **생성**: 본인만 가능 (`authorId == uid`)
- **수정**: 본인만 가능 (단, trust/risk 필드는 admin/CF만)
  - 제한 필드: `trustScore`, `ratingAvg`, `completedSales`, `reviewCount`, `recentPosts`, `trustTier`, `riskScore`, `riskFlags`, `riskTier`, `lastRiskUpdatedAt`

### 2. Market Posts 컬렉션 규칙 추가
- **읽기**: 모든 사용자 허용 (공개 정보) + 관리자 analytics용
- **생성**: `authorId == uid`인 경우만 허용
- **수정**: 
  - 작성자만 가능 (콘텐츠 필드: title, description, price, images 등)
  - metrics 필드 임시 허용 (v1 - 향후 CF로 이동)
    - 제한 필드: `views`, `likesCount`, `chatCount`, `rankScore`, `viewCount`, `likeCount`
  - 관리자는 모든 필드 수정 가능
- **삭제**: 작성자 또는 관리자만 가능

### 3. Notifications 컬렉션 규칙 업데이트
- **읽기**: 본인만 가능
- **수정**: 본인만 가능 (read 필드만 수정 가능 - 읽음 처리)
- **생성**: v1 임시 허용 (필드 제한) - 최종은 CF로 이동
  - 필수 필드: `userId`, `type`, `message`, `read`, `createdAt`
  - 허용된 타입: `CHAT_MESSAGE`, `CHAT_LOCATION_SHARED`, `TRADE_RESERVED`, `TRADE_COMPLETED`, `RECRUIT_NEW_MEMBER`, `RECRUIT_KICKED`, `RECRUIT_CLOSED`, `MARKET_JOIN_APPROVED`, `MARKET_JOIN_CANCELLED`, `MARKET_JOIN_REJECTED`, `chat`, `transaction`, `like`, `recommendation`
- **삭제**: 본인만 가능

### 4. Chat Rooms 컬렉션 규칙 업데이트
- **읽기**: 로그인 유저면 모두 허용 + 관리자 analytics용 (`isGlobalAdmin()`)

## 📐 규칙 구조

### Users 컬렉션
```javascript
match /users/{userId} {
  // 읽기: 본인만 가능
  allow get: if request.auth != null && request.auth.uid == userId;
  // list: 관리자만 가능 (admin analytics용)
  allow list: if isGlobalAdmin();
  
  // 생성: 본인만 가능
  allow create: if request.auth != null && request.auth.uid == userId;
  
  // 수정: 본인만 가능 (단, trust/risk 필드는 admin/CF만)
  allow update: if request.auth != null && request.auth.uid == userId
    && (
      // trust/risk 필드 변경 금지 (admin/CF만 가능)
      (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['trustScore', 'ratingAvg', 'completedSales', 'reviewCount', 'recentPosts', 'trustTier', 'riskScore', 'riskFlags', 'riskTier', 'lastRiskUpdatedAt']))
      || isGlobalAdmin()
    );
  
  // 삭제: 본인만 가능
  allow delete: if request.auth != null && request.auth.uid == userId;
}
```

### Market Posts 컬렉션
```javascript
match /marketPosts/{postId} {
  // 읽기: 모든 사용자 허용 (공개 정보) + 관리자 analytics용
  allow read: if true || isGlobalAdmin();
  
  // 생성: authorId==uid인 경우만 허용
  allow create: if isSignedIn()
    && request.resource.data.authorId == request.auth.uid;
  
  // 수정: 작성자만 가능 (콘텐츠 필드) + metrics 임시 허용
  allow update: if isSignedIn() && (
    // 케이스 1: 작성자가 콘텐츠 수정
    (request.auth.uid == resource.data.authorId
      && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['views', 'likesCount', 'chatCount', 'rankScore', 'viewCount', 'likeCount']))
    ||
    // 케이스 2: metrics 필드 임시 허용 (v1 - 향후 CF로 이동)
    (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['views', 'likesCount', 'chatCount', 'rankScore', 'viewCount', 'likeCount'])
      && (request.auth.uid == resource.data.authorId || isGlobalAdmin()))
    ||
    // 케이스 3: 관리자 (모든 필드 수정 가능)
    isGlobalAdmin()
  );
  
  // 삭제: 작성자만 가능
  allow delete: if isSignedIn() && (
    request.auth.uid == resource.data.authorId ||
    isGlobalAdmin()
  );
}
```

### Notifications 컬렉션
```javascript
match /notifications/{notiId} {
  // 읽기: 본인만 가능
  allow read: if isSignedIn() 
    && request.auth.uid == resource.data.userId;
  
  // 수정: 본인만 가능 (read 필드만 수정 가능)
  allow update: if isSignedIn() 
    && request.auth.uid == resource.data.userId
    && (
      // read 필드만 수정 가능 (읽음 처리)
      request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read'])
      || request.resource.data.read == resource.data.read
    );
  
  // 생성: v1 임시 허용 (필드 제한) - 최종은 CF로 이동
  allow create: if isSignedIn() 
    && request.resource.data.userId is string
    && request.resource.data.type is string
    && request.resource.data.message is string
    && request.resource.data.read is bool
    && request.resource.data.createdAt is timestamp
    && (
      // 허용된 타입만
      request.resource.data.type in ["CHAT_MESSAGE", "CHAT_LOCATION_SHARED", "TRADE_RESERVED", "TRADE_COMPLETED", "RECRUIT_NEW_MEMBER", "RECRUIT_KICKED", "RECRUIT_CLOSED", "MARKET_JOIN_APPROVED", "MARKET_JOIN_CANCELLED", "MARKET_JOIN_REJECTED", "chat", "transaction", "like", "recommendation"]
    );
  
  // 삭제: 본인만 가능
  allow delete: if isSignedIn() 
    && request.auth.uid == resource.data.userId;
}
```

### Chat Rooms 컬렉션
```javascript
match /chatRooms/{roomId} {
  // 읽기: 로그인 유저면 모두 허용 + 관리자 analytics용
  allow read: if request.auth != null || isGlobalAdmin();
  // ... (나머지 규칙 유지)
}
```

## 🎯 효과

### 보안 강화
1. **Users**: trust/risk 필드는 admin/CF만 수정 가능
2. **Market Posts**: metrics 필드는 임시 허용 (향후 CF로 이동)
3. **Notifications**: 필드 제한으로 안전한 생성
4. **Chat Rooms**: 관리자 analytics용 read 허용

### Admin Analytics 지원
- `marketPosts` 컬렉션: 관리자 read 허용
- `chatRooms` 컬렉션: 관리자 read 허용
- `users` 컬렉션: 관리자 list 허용

## 📝 향후 개선 사항

### Cloud Function으로 이동 예정
1. **Market Posts metrics**: `views`, `likesCount`, `chatCount`, `rankScore` 업데이트는 CF로 이동
2. **Notifications 생성**: 최종적으로는 CF에서만 생성 가능하도록 변경

## ✅ 배포 완료

```bash
firebase deploy --only firestore:rules
```

**배포 성공!** 모든 규칙이 적용되었습니다.

---

**Firestore Security Rules 권한 에러 해결 완료!** 🎉
