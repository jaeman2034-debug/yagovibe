# 🚀 YAGO SPORTS 핵심 4가지 구조 (플랫폼 성공 구조)

## 📊 플랫폼 성공 원칙

풋살/축구 플랫폼은 **3가지 콘텐츠 순환 구조**가 핵심입니다:

```
용병 → 팀 가입
팀 → 매칭
매칭 → 용병
```

---

## 1️⃣ 트래픽 터지는 홈 화면 구조

### 핵심 원칙
**게시판처럼 만들면 망한다. 반드시 "지금 경기 / 오늘 용병" 중심이어야 한다.**

### 홈 레이아웃 구조

```
HEADER

🔥 오늘 용병 (가장 위 - 사용률 1위)
  - 오늘 날짜의 guest_players
  - 시간순 정렬
  - [지원하기] 버튼

🔥 오늘 경기 매칭
  - 오늘 날짜의 matches
  - 시간순 정렬
  - [신청하기] 버튼

🔥 최신 팀원 모집
  - 최근 3일 내 recruits
  - 최신순 정렬
  - [지원하기] 버튼

🔥 우리 지역 팀
  - 유저 region 기반 teams
  - 활동 많은 순
  - [가입하기] 버튼
```

### Firestore 쿼리

#### 오늘 용병
```typescript
guest_players
where date == today
orderBy time (asc)
limit 10
```

#### 오늘 경기 매칭
```typescript
matches
where date == today
where status == "open"
orderBy time (asc)
limit 10
```

#### 최신 팀원 모집
```typescript
recruits
where status == "open"
where createdAt >= 3일 전
orderBy createdAt (desc)
limit 10
```

#### 우리 지역 팀
```typescript
teams
where region == user.region
orderBy createdAt (desc)
limit 10
```

---

## 2️⃣ 용병 시스템 완성 구조

### Firestore 구조

#### guest_players 컬렉션
```
guest_players/{guestId}
{
  authorId: string  // 팀 없어도 작성 가능
  
  date: Timestamp
  time: string
  region: string
  stadium?: string
  
  position: string[]  // 필요한 포지션
  slots: number  // 필요한 인원
  
  fee?: number
  description?: string
  
  status: "open" | "closed"
  createdAt: Timestamp
}
```

#### guest_applications 컬렉션
```
guest_applications/{applicationId}
{
  guestId: string
  userId: string
  userName?: string
  message?: string
  
  status: "pending" | "accepted" | "rejected"
  createdAt: Timestamp
}
```

### 페이지 구조
- `/guest` → GuestPlayerListPage (목록)
- `/guest/create` → GuestPlayerCreatePage (작성)
- `/guest/:id` → GuestPlayerDetailPage (상세)

### 권한 정책
- ✅ **팀 없어도 작성 가능** (개인도 용병 지원/모집 가능)
- ✅ **트래픽 핵심 기능** (플랫폼 성장의 핵심)

---

## 3️⃣ 팀 페이지 구조

### 팀 페이지 구성

```
팀 로고
팀 이름
지역
팀 레벨

[팀원 목록]
  - owner
  - admin
  - member

[경기 기록]
  - 최근 매칭 결과
  - 승/무/패

[모집 글]
  - 현재 진행 중인 모집
  - 최근 모집 이력

[팀 활동]
  - 최근 활동 피드
```

### Firestore 구조
```
teams/{teamId}
{
  name: string
  region: string
  level: string
  logo?: string
  ownerUid: string
  createdAt: Timestamp
}

teams/{teamId}/members/{userId}
{
  userId: string
  role: "owner" | "admin" | "member"
  status: "active"
  joinedAt: Timestamp
}
```

---

## 4️⃣ 매칭 추천 시스템

### 추천 로직

```
같은 지역
같은 레벨
비슷한 시간
```

### Firestore 쿼리
```typescript
matches
where region == team.region
where level == team.level
where date >= today
where status == "open"
orderBy date (asc)
orderBy time (asc)
```

### 추천 우선순위
1. 같은 지역 + 같은 레벨
2. 같은 지역 + 비슷한 레벨
3. 인근 지역 + 같은 레벨

---

## 🔥 다음 단계 MVP 완성 (4가지)

### 1️⃣ 팀 가입 신청 시스템

**Firestore 구조**
```
team_join_requests/{requestId}
{
  teamId: string
  userId: string
  userName?: string
  message?: string
  
  status: "pending" | "accepted" | "rejected"
  createdAt: Timestamp
}
```

**기능**
- 팀 검색 → 가입 신청
- 팀장 승인/거절
- 알림 연동

---

### 2️⃣ 모집 지원 시스템

**Firestore 구조**
```
recruit_applications/{applicationId}
{
  recruitId: string
  userId: string
  userName?: string
  message?: string
  
  status: "pending" | "accepted" | "rejected"
  createdAt: Timestamp
}
```

**기능**
- 모집글 → 지원
- 팀장 승인/거절
- 알림 연동

---

### 3️⃣ 매칭 신청 시스템

**Firestore 구조**
```
match_requests/{requestId}
{
  matchId: string
  teamId: string
  teamName: string
  message?: string
  
  status: "pending" | "accepted" | "rejected"
  createdAt: Timestamp
}
```

**기능**
- 매칭글 → 신청
- 작성자 승인/거절
- 경기 확정 시 status: "matched"
- 알림 연동

---

### 4️⃣ 알림 시스템

**Firestore 구조**
```
notifications/{notificationId}
{
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  
  isRead: boolean
  createdAt: Timestamp
}
```

**알림 타입**
- `TEAM_JOIN_REQUEST` - 팀 가입 요청
- `TEAM_JOIN_APPROVED` - 팀 가입 승인
- `RECRUIT_APPLICATION` - 모집 지원
- `RECRUIT_APPLICATION_APPROVED` - 모집 지원 승인
- `MATCH_REQUEST` - 매칭 신청
- `MATCH_REQUEST_APPROVED` - 매칭 신청 승인
- `GUEST_APPLICATION` - 용병 지원
- `GUEST_APPLICATION_APPROVED` - 용병 지원 승인

---

## 📋 구현 우선순위

### Phase 1: 홈 화면 개선 (우선순위 높음)
1. 오늘 용병 섹션
2. 오늘 경기 매칭 섹션
3. 최신 팀원 모집 섹션
4. 우리 지역 팀 섹션

### Phase 2: 용병 시스템 완성
1. GuestPlayerCreatePage
2. GuestPlayerListPage
3. GuestPlayerDetailPage
4. ActivityFeed 연동

### Phase 3: 지원/신청 시스템
1. 팀 가입 신청
2. 모집 지원
3. 매칭 신청
4. 알림 시스템

---

## 🎯 플랫폼 성공 지표

### 핵심 메트릭
- **일일 활성 용병 글 수** (DAU)
- **일일 매칭 성사 수**
- **일일 모집 지원 수**
- **팀 가입 신청 수**

### 순환 구조 확인
```
용병 → 팀 가입 증가
팀 → 매칭 증가
매칭 → 용병 증가
```

---

## ✅ 현재 완성도

| 기능 | 상태 | 완성도 |
|------|------|--------|
| 홈 화면 (ActivityFeed) | ✅ | 85% |
| 용병 시스템 (타입/서비스/훅) | ✅ | 60% |
| 용병 페이지 | ❌ | 0% |
| 팀 페이지 | ✅ | 90% |
| 매칭 추천 | ❌ | 0% |
| 지원/신청 시스템 | ❌ | 0% |
| 알림 시스템 | ✅ | 70% |

**전체 완성도**: **70% → 75%** (서비스 레이어 추가)

---

## 🚀 다음 단계 제안

1. **홈 화면 개선** (오늘 용병/매칭 섹션)
2. **Guest Player 페이지 구현**
3. **지원/신청 시스템 구현**
4. **알림 시스템 연동**
