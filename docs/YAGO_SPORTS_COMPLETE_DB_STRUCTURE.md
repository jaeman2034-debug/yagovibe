# 🗄️ YAGO SPORTS 완전한 Firestore DB 구조 (최종 정리)

## 📋 컬렉션 목록 (6개 핵심 + 보조)

### 핵심 컬렉션 (6개)
1. ✅ `teams` - 팀 정보
2. ✅ `recruits` - 팀원 모집
3. ✅ `matches` - 경기 매칭
4. ✅ `guest_players` - 용병 모집
5. ✅ `activities` - Activity Feed
6. ✅ `market` (또는 `posts`) - 거래 게시글

### 보조 컬렉션
- `users` - 사용자 프로필
- `team_members` - 팀 멤버 역인덱스
- `recruit_applications` - 모집 지원
- `match_requests` - 매칭 신청
- `guest_applications` - 용병 지원
- `team_join_requests` - 팀 가입 신청
- `notifications` - 알림
- `inviteLinks` - 팀 초대 링크

---

## 🔥 완전한 스키마 정의

### 1. teams/{teamId}
```typescript
{
  id: string;
  name: string;
  sportType: string; // ✅ "soccer" | "basketball" | "baseball" 등
  region: string; // ✅ 지역 필드
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

### 2. recruits/{recruitId}
```typescript
{
  id: string;
  teamId: string;
  teamName: string;
  authorId: string;
  
  sport: SportType; // 🔥 필수: "soccer" | "basketball" 등 (팀의 sportType에서 복사)
  position: string[];
  slots: number;
  region: string; // ✅ 지역 필드
  trainingDays?: string[];
  level: "취미" | "아마추어" | "준선수";
  contact: "채팅" | "전화";
  description?: string;
  
  status: "open" | "closed";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 3. matches/{matchId}
```typescript
{
  id: string;
  teamId: string;
  teamName: string;
  authorId: string;
  
  sport: SportType; // 🔥 필수: "soccer" | "basketball" 등 (팀의 sportType에서 복사)
  date: Timestamp;
  time: string;
  region: string; // ✅ 지역 필드
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

### 4. guest_players/{guestId}
```typescript
{
  id: string;
  authorId: string; // 팀 없어도 작성 가능
  
  sport: SportType; // 🔥 필수: "soccer" | "basketball" 등 (사용자가 선택)
  date: Timestamp;
  time: string;
  region: string; // ✅ 지역 필드
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

### 5. activities/{activityId}
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

### 6. market/{postId}
```typescript
{
  id: string;
  authorId: string;
  title: string;
  description?: string;
  price?: number;
  category: string;
  sport: string; // ✅ 이미 존재
  region?: string; // ✅ 지역 필드 (선택적)
  imageUrls?: string[];
  status: "open" | "closed" | "sold";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## 🔥 핵심 필터 필드 (Sport + Region)

### Sport 필드
| 컬렉션 | 필드명 | 값 | 상태 |
|--------|--------|-----|------|
| teams | `sportType` | "soccer" \| "basketball" 등 | ✅ |
| recruits | `sport` | SportType | ✅ 방금 추가 |
| matches | `sport` | SportType | ✅ 방금 추가 |
| guest_players | `sport` | SportType | ✅ 방금 추가 |
| activities | `sport` | string | ✅ |
| market | `sport` | string | ✅ |

### Region 필드
| 컬렉션 | 필드명 | 상태 |
|--------|--------|------|
| teams | `region` | ✅ |
| recruits | `region` | ✅ |
| matches | `region` | ✅ |
| guest_players | `region` | ✅ |
| users | `region` | ✅ |
| market | `region` | ✅ (선택적) |

---

## 📊 쿼리 패턴 예시

### Sport + Region 필터
```typescript
// 예: soccer + 의정부
where("sport", "==", "soccer")
where("region", "==", "의정부")

// 예: basketball + 강남
where("sport", "==", "basketball")
where("region", "==", "강남")
```

### 복합 쿼리
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

// 최신 모집 (basketball + 강남)
query(
  collection(db, "recruits"),
  where("sport", "==", "basketball"),
  where("region", "==", "강남"),
  where("status", "==", "open"),
  orderBy("createdAt", "desc"),
  limit(10)
)
```

---

## 🚀 필수 Firestore 인덱스

### Recruits
```
Collection: recruits
Fields:
  - sport (Ascending)
  - region (Ascending)
  - status (Ascending)
  - createdAt (Descending)
```

### Matches
```
Collection: matches
Fields:
  - sport (Ascending)
  - region (Ascending)
  - status (Ascending)
  - date (Ascending)
  - time (Ascending)
```

### Guest Players
```
Collection: guest_players
Fields:
  - sport (Ascending)
  - region (Ascending)
  - status (Ascending)
  - date (Ascending)
  - time (Ascending)
```

---

## ✅ 완료 상태

| 작업 | 상태 |
|------|------|
| 타입 정의에 `sport` 필드 추가 | ✅ 완료 |
| 서비스 레이어에 `sport` 필터 추가 | ✅ 완료 |
| 훅에 `sport` 필터 추가 | ✅ 완료 |
| 페이지에서 팀의 `sportType` 자동 복사 | ✅ 완료 |
| Region 필드 확인 | ✅ 모두 존재 |
| Firestore 인덱스 추가 | ⚠️ 필요 |

---

## 🎯 다음 단계

1. **Firestore 인덱스 추가** (위 인덱스 목록 참고)
2. **기존 데이터 마이그레이션** (sport 필드 추가)
3. **홈 화면 필터링 연동** (selectedSport로 필터링)
