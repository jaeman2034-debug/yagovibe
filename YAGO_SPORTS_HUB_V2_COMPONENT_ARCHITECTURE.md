# 🏗️ YAGO 스포츠 허브 v2 - 컴포넌트 구조 + 라우트 설계

## 📐 컴포넌트 트리 (v2 표준)

```
MainHubPage (SportHub.tsx)
 ├ Header (공통)
 ├ StoryZone (신규)
 │   ├ StorySlide
 │   ├ StoryIndicator
 │   └ StoryCTA
 ├ CoreGrid (4그리드)
 │   ├ MarketCard
 │   │   └ ChatBadge (채팅 배지)
 │   ├ TeamFindCard
 │   ├ VenueCard
 │   └ MyTeamCard
 │       └ ProBadge
 └ RecommendSection (선택)
```

### 내 팀 내부 구조

```
MyTeamPage (TeamPage.tsx)
 ├ TeamTabs
 │   ├ ScheduleTab (기본 탭)
 │   │   ├ ScheduleList
 │   │   ├ ScheduleCard
 │   │   ├ CreateScheduleButton (운영자만)
 │   │   └ ScheduleFilter
 │   ├ MemberTab
 │   ├ RecordTab
 │   └ NoticeTab
 └ TeamHeader
```

---

## 🧩 라우트 재편 (확정)

### 메인 허브
```typescript
/sports-hub              // 메인 허브
/sports/{type}           // 종목별 허브
```

### 핵심 기능
```typescript
/market?type={type}      // 축구 마켓
/teams/search?type={type} // 팀 찾기 (협회 카드 포함)
/facilities?type={type}  // 구장 찾기
```

### 내 팀
```typescript
/sports/{type}/team                    // 내 팀 (기본: 일정 탭)
/sports/{type}/team/schedule           // 일정 목록
/sports/{type}/team/schedule/new       // 일정 생성 (운영자만)
/sports/{type}/team/schedule/{id}      // 일정 상세
/sports/{type}/team/members            // 멤버 관리
/sports/{type}/team/records            // 경기 기록
/sports/{type}/team/notices            // 공지
```

### 폐기
- ❌ `/schedule` (독립 경로)
- ❌ 일정 독립 그리드

---

## 🔐 권한 로직 (구현)

### 일정 생성 버튼 표시 조건
```typescript
const canCreateSchedule = (user: User, team: Team): boolean => {
  return user.id === team.ownerId || 
         user.role === 'TEAM_ADMIN' ||
         team.admins?.includes(user.id);
};
```

### 일정 수정/삭제 버튼 표시 조건
```typescript
const canEditSchedule = (
  user: User, 
  schedule: Schedule, 
  team: Team
): boolean => {
  return schedule.creatorId === user.id || 
         canCreateSchedule(user, team);
};
```

### 역할별 권한 매트릭스
| 역할 | 생성 | 수정/삭제 | 조회 | 참석 응답 |
|------|------|----------|------|----------|
| 팀 운영자 | ✅ | ✅ | ✅ | ✅ |
| 팀 관리자 | ✅ | ✅ | ✅ | ✅ |
| 팀 멤버 | ❌ | ❌ | ✅ | ✅ |
| 일반 사용자 | ❌ | ❌ | ❌ (비공개) | ❌ |

---

## 📊 스토리 존 데이터 모델

### Story 타입 정의
```typescript
interface Story {
  id: string;
  sportType: string; // 'football', 'basketball', etc.
  type: 'tournament' | 'team_promo' | 'match_highlight' | 'community';
  source: 'curated' | 'association' | 'user'; // 혼합 모델
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string; // 15초 이내
  ctaButtons: {
    label: string;
    action: 'team_find' | 'today_match' | 'custom';
    link?: string;
  }[];
  isActive: boolean;
  priority: number; // 정렬 순서
  verified: boolean; // 검증 여부
  createdAt: Timestamp;
  expiresAt?: Timestamp; // 만료일
}
```

### Firestore 구조
```
stories/{storyId}
```

### 운영 규칙 (혼합 모델)
- **운영팀 큐레이션 (60%)**: 즉시 사용, 검증 불필요
- **협회 제공 (30%)**: 공식 확인 후 승인
- **사용자 업로드 (10%)**: 검토 후 승인

### 스토리 존 표시 규칙
- 최대 5개 슬라이드
- `isActive === true`만 표시
- `priority` 순서로 정렬
- `expiresAt` 체크 (만료된 스토리 제외)
- 종목별 필터링 (`sportType`)

---

## 📅 일정 생성 폼 설계

### 폼 필드
```typescript
interface ScheduleForm {
  type: '경기' | '훈련' | '친선';
  title: string;
  dateTime: Date;
  place: string;
  placeCoordinates?: { lat: number; lng: number };
  opponent?: string; // 경기만
  isPublic: boolean;
  needsSubstitute: boolean; // 용병 모집
  description?: string;
}
```

### 폼 레이아웃
```
┌─────────────────────────────────────┐
│ [취소] 일정 만들기                  │
├─────────────────────────────────────┤
│                                     │
│ 유형 선택 *                          │
│ ○ 경기  ● 훈련  ○ 친선              │
│                                     │
│ 제목 *                               │
│ [정기 훈련                    ]     │
│                                     │
│ 날짜 *                               │
│ [2024.01.20]                        │
│                                     │
│ 시간 *                               │
│ [19:00]                             │
│                                     │
│ 장소 *                               │
│ [풋살장 A                    ]      │
│ [지도에서 선택]                     │
│                                     │
│ 상대팀 (경기/친선만)                 │
│ [노원 FC                    ]       │
│                                     │
│ 공개 설정                            │
│ ○ 팀 내부만  ● 공개                 │
│                                     │
│ 용병 모집                            │
│ ☐ 용병 모집하기                      │
│                                     │
│ 설명 (선택)                          │
│ [메모 입력...                  ]    │
│                                     │
│ [일정 만들기]                       │
└─────────────────────────────────────┘
```

### 유효성 검사
- 제목: 필수, 최대 50자
- 날짜/시간: 필수, 미래 날짜만
- 장소: 필수
- 상대팀: 경기/친선일 때 필수

---

## 🔔 알림 트리거 규칙

### 일정 생성 시
```typescript
// 트리거 조건
if (schedule.created) {
  // 1. 팀 멤버 전체 알림
  notifyTeamMembers(team.members, {
    type: 'SCHEDULE_CREATED',
    scheduleId: schedule.id,
    title: schedule.title,
    dateTime: schedule.dateTime,
    priority: 'high'
  });

  // 2. 채팅방 자동 생성
  createChatRoom({
    type: 'schedule',
    scheduleId: schedule.id,
    teamId: team.id,
    participants: team.members
  });

  // 3. FCM 푸시 (선택)
  sendPushNotification({
    tokens: getFcmTokens(team.members),
    title: '새 일정이 등록되었어요',
    body: `${schedule.title} - ${formatDateTime(schedule.dateTime)}`,
    data: { scheduleId: schedule.id }
  });
}
```

### 일정 변경 시
```typescript
// 트리거 조건
if (schedule.updated) {
  notifyTeamMembers(team.members, {
    type: 'SCHEDULE_UPDATED',
    scheduleId: schedule.id,
    title: schedule.title,
    changes: schedule.changes, // 변경 사항
    priority: 'high'
  });
}
```

### 일정 삭제 시
```typescript
// 트리거 조건
if (schedule.deleted) {
  notifyTeamMembers(team.members, {
    type: 'SCHEDULE_DELETED',
    scheduleId: schedule.id,
    title: schedule.title,
    priority: 'normal'
  });
}
```

### 알림 타입 정의
```typescript
type NotificationType = 
  | 'SCHEDULE_CREATED'
  | 'SCHEDULE_UPDATED'
  | 'SCHEDULE_DELETED'
  | 'ATTENDANCE_RESPONSE'
  | 'CHAT_MESSAGE'
  | 'PRICE_OFFER'
  | 'TRADE_STATUS';
```

---

## 🎨 UI 규칙 (확정)

### 스토리 존
- 최대 5개 슬라이드
- 영상 15초 이내
- CTA 2개 고정 (팀 찾기 / 오늘 경기)
- 자동 슬라이드 5초
- 수동 전환 가능 (인디케이터 클릭)

### 그리드
- 2x2 고정 레이아웃
- 텍스트 2줄 제한
- 배지: 마켓(채팅) / 내팀(Pro)만 허용
- 아이콘 크기: 48px
- 카드 간격: 16px

### 내 팀 탭
- 기본 탭: 일정
- 탭 전환: 상단 고정
- 운영자만 생성 버튼 표시

---

## 🛠 개발 체크리스트 (상세)

### Phase 1: 구조 변경
- [ ] 일정 그리드 삭제 (SportHub.tsx)
- [ ] 6그리드 → 4그리드 재구성
- [ ] 거래 장터 1번 배치
- [ ] 스토리존 컴포넌트 추가
- [ ] 협회 카드 → 팀 찾기 내부 이동

### Phase 2: 내 팀 일정
- [ ] 내팀 기본 탭 = 일정 설정
- [ ] 일정 목록 컴포넌트
- [ ] 일정 생성 폼 (운영자만)
- [ ] 일정 상세 화면
- [ ] 권한 분기 로직

### Phase 3: 데이터 & 알림
- [ ] Schedule 타입 정의
- [ ] Story 타입 정의
- [ ] Firestore 컬렉션 구조
- [ ] 알림 트리거 함수
- [ ] FCM 푸시 연동

---

## 📁 파일 구조

```
src/
├ pages/
│   ├ sports/
│   │   └ SportHub.tsx (메인 허브)
│   └ team/
│       └ TeamPage.tsx (내 팀)
├ components/
│   ├ sports/
│   │   ├ StoryZone.tsx (신규)
│   │   └ CoreGrid.tsx
│   └ team/
│       ├ ScheduleTab.tsx (신규)
│       ├ ScheduleList.tsx (신규)
│       ├ ScheduleCard.tsx (신규)
│       └ CreateScheduleForm.tsx (신규)
├ types/
│   ├ schedule.ts (신규)
│   └ story.ts (신규)
└ lib/
    ├ schedules/
    │   ├ createSchedule.ts (신규)
    │   ├ updateSchedule.ts (신규)
    │   └ deleteSchedule.ts (신규)
    └ notifications/
        └ scheduleNotifications.ts (신규)
```

---

## 🚀 다음 단계

1. ✅ 컴포넌트 트리 설계 (완료)
2. ✅ 라우트 설계도 (완료)
3. ✅ 스토리존 데이터 모델 (완료)
4. ✅ 일정 생성 폼 설계 (완료)
5. ✅ 알림 트리거 규칙 (완료)
6. ⏭️ 코드 패치 실행
