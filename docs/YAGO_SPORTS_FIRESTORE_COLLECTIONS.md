# 🗄️ YAGO SPORTS Firestore 컬렉션 구조 (완전 정리)

## 📋 핵심 컬렉션 목록

### 1. Core Collections (핵심)
- `users` - 사용자 프로필
- `teams` - 팀 정보
- `team_members` - 팀 멤버 역인덱스

### 2. Sports Platform Collections (스포츠 플랫폼)
- `recruits` - 팀원 모집
- `matches` - 경기 매칭
- `guest_players` - 용병 모집
- `activities` - Activity Feed

### 3. Market Collections (거래)
- `market` (또는 `posts`) - 거래 게시글

### 4. Application Collections (지원/신청)
- `recruit_applications` - 모집 지원
- `match_requests` - 매칭 신청
- `guest_applications` - 용병 지원
- `team_join_requests` - 팀 가입 신청

### 5. Notification Collections (알림)
- `notifications` - 사용자 알림

### 6. Invite Collections (초대)
- `inviteLinks` - 팀 초대 링크

---

## 🔥 완전한 스키마 정의

### 1. users/{uid}
```typescript
{
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  phoneNumber?: string;
  role?: "ADMIN" | "USER"; // 플랫폼 권한
  region?: string; // ✅ 지역 필드 존재
  sport?: string; // 선호 스포츠
  profileCompleted?: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 2. teams/{teamId}
```typescript
{
  id: string;
  name: string;
  sportType: string; // ✅ "soccer" | "basketball" 등
  region: string; // ✅ 지역 필드 존재
  level?: string;
  logo?: string;
  ownerUid: string;
  status: "active" | "inactive";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// 서브컬렉션: teams/{teamId}/members/{uid}
{
  userId: string;
  role: "owner" | "admin" | "member";
  status: "active";
  joinedAt: Timestamp;
}
```

### 3. team_members/{teamId}_{userId}
```typescript
{
  teamId: string;
  userId: string;
  uid: string;
  role: "owner" | "admin" | "member";
  status: "active";
  createdAt: Timestamp;
  joinedAt: Timestamp;
}
```

### 4. recruits/{recruitId}
```typescript
{
  id: string;
  teamId: string;
  teamName: string;
  authorId: string;
  
  sport: SportType; // 🔥 필수 필드: "soccer" | "basketball" 등
  position: string[];
  slots: number;
  region: string; // ✅ 지역 필드 존재
  trainingDays?: string[];
  level: "취미" | "아마추어" | "준선수";
  contact: "채팅" | "전화";
  description?: string;
  
  status: "open" | "closed";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 5. matches/{matchId}
```typescript
{
  id: string;
  teamId: string;
  teamName: string;
  authorId: string;
  
  sport: SportType; // 🔥 필수 필드: "soccer" | "basketball" 등
  date: Timestamp;
  time: string;
  region: string; // ✅ 지역 필드 존재
  stadium?: string;
  level: "취미" | "아마추어";
  fee?: number;
  contact: "채팅" | "전화";
  description?: string;
  
  status: "open" | "matched" | "finished";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 6. guest_players/{guestId}
```typescript
{
  id: string;
  authorId: string; // 팀 없어도 작성 가능
  
  sport: SportType; // 🔥 필수 필드: "soccer" | "basketball" 등
  date: Timestamp;
  time: string;
  region: string; // ✅ 지역 필드 존재
  stadium?: string;
  
  position: string[];
  slots: number;
  fee?: number;
  description?: string;
  
  status: "open" | "closed";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 7. activities/{activityId}
```typescript
{
  id: string;
  type: ActivityType;
  refType: "teams" | "notices" | "events" | "market" | "recruit" | "match" | "equipment";
  refId: string;
  
  authorId: string;
  teamId?: string;
  
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  
  visibility: "public" | "team" | "private";
  sport?: string; // ✅ 이미 존재
  
  likeCount: number;
  commentCount: number;
  
  createdAt: Timestamp;
}
```

### 8. market/{postId} (또는 posts/{postId})
```typescript
{
  id: string;
  authorId: string;
  title: string;
  description?: string;
  price?: number;
  category: string;
  sport: string; // ✅ 이미 존재
  region?: string; // ✅ 지역 필드 존재
  imageUrls?: string[];
  status: "open" | "closed" | "sold";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 9. recruit_applications/{applicationId}
```typescript
{
  id: string;
  recruitId: string;
  userId: string;
  userName?: string;
  message?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
}
```

### 10. match_requests/{requestId}
```typescript
{
  id: string;
  matchId: string;
  teamId: string;
  teamName: string;
  message?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
}
```

### 11. guest_applications/{applicationId}
```typescript
{
  id: string;
  guestId: string;
  userId: string;
  userName?: string;
  message?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
}
```

### 12. team_join_requests/{requestId}
```typescript
{
  id: string;
  teamId: string;
  userId: string;
  userName?: string;
  message?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
}
```

### 13. notifications/{notificationId}
```typescript
{
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Timestamp;
}
```

### 14. inviteLinks/{linkId}
```typescript
{
  id: string;
  teamId: string;
  role: "member";
  expiresAt?: Timestamp;
  maxUses?: number;
  usedCount: number;
  createdBy: string;
  isActive: boolean;
  createdAt: Timestamp;
}
```

---

## 🔥 핵심 필터 필드

### Sport 필드 (멀티 스포츠 지원)
- ✅ `teams.sportType`
- ✅ `recruits.sport` (방금 추가)
- ✅ `matches.sport` (방금 추가)
- ✅ `guest_players.sport` (방금 추가)
- ✅ `activities.sport`
- ✅ `market.sport`

### Region 필드 (지역 필터)
- ✅ `teams.region`
- ✅ `recruits.region`
- ✅ `matches.region`
- ✅ `guest_players.region`
- ✅ `users.region`
- ✅ `market.region` (선택적)

---

## 📊 쿼리 패턴

### Sport + Region 필터
```typescript
// 예: soccer + 의정부
where("sport", "==", "soccer")
where("region", "==", "의정부")

// 예: basketball + 강남
where("sport", "==", "basketball")
where("region", "==", "강남")
```

### 복합 쿼리 예시
```typescript
// 오늘 용병 (soccer + 의정부)
query(
  collection(db, "guest_players"),
  where("sport", "==", "soccer"),
  where("region", "==", "의정부"),
  where("status", "==", "open"),
  where("date", ">=", startOfDay),
  where("date", "<=", endOfDay),
  orderBy("date", "asc"),
  orderBy("time", "asc")
)
```

---

## ✅ 완료 상태

| 컬렉션 | sport 필드 | region 필드 | 상태 |
|--------|-----------|-------------|------|
| teams | ✅ sportType | ✅ region | 완료 |
| recruits | ✅ sport (방금 추가) | ✅ region | 완료 |
| matches | ✅ sport (방금 추가) | ✅ region | 완료 |
| guest_players | ✅ sport (방금 추가) | ✅ region | 완료 |
| activities | ✅ sport | ❌ region | 선택적 |
| market | ✅ sport | ✅ region | 완료 |

---

## 🚀 다음 단계

1. ✅ 타입 정의에 `sport` 필드 추가 완료
2. ✅ 서비스 레이어에 `sport` 필터 추가 완료
3. ✅ 훅에 `sport` 필터 추가 완료
4. ⚠️ 페이지에서 팀의 `sportType` 자동 복사 (진행 중)
5. ⚠️ Firestore 인덱스 추가 필요
