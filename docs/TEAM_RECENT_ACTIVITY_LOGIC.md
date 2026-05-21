# 🤖 AI가 '최근 활동'을 고르는 기준 로직 설계

## 📋 목적
공개 블로그 히어로 영역에 표시할 "최근 활동"을 AI가 자동으로 선택하여 "항상 살아있는 팀"을 연출

---

## 1️⃣ 최근 활동 데이터 소스

### 데이터 소스 우선순위

1. **최근 일정 (Schedules)**
   - 경로: `teams/{teamId}/schedules`
   - 필드: `date`, `event`, `title`, `location`, `participants`
   - 우선순위: ⭐⭐⭐⭐⭐ (가장 신뢰도 높음)

2. **최근 출석 (Attendance)**
   - 경로: `teams/{teamId}/attendance`
   - 필드: `date`, `participants`, `count`
   - 우선순위: ⭐⭐⭐⭐ (활동 증명)

3. **최근 블로그 포스트**
   - 경로: `teams/{teamId}/blog_posts`
   - 필드: `publishedAt`, `postType`, `title`
   - 우선순위: ⭐⭐⭐ (콘텐츠 증명)

4. **팀 사진 (선택)**
   - 경로: `teams/{teamId}/photos` 또는 Storage
   - 필드: `uploadedAt`, `url`, `eventId`
   - 우선순위: ⭐⭐⭐⭐⭐ (시각적 신뢰 최고, 있으면 최우선)

---

## 2️⃣ 선택 기준 (우선순위 순)

### 기준 1: 시간적 최신성 (가장 중요)

**규칙:**
- 최근 14일 이내 활동만 표시
- 14일 초과 시 "최근 활동 없음" 표시

**예시:**
```typescript
const now = new Date();
const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

// 일정 필터링
const recentSchedules = schedules.filter(s => 
  new Date(s.date) >= twoWeeksAgo
);
```

---

### 기준 2: 활동 유형별 가중치

**가중치 점수:**
- 사진 (경기/활동): 100점
- 일정 (경기/연습): 80점
- 출석 (훈련 완료): 60점
- 블로그 포스트 (후기): 40점

**선택 로직:**
```typescript
function selectBestActivity(activities: Activity[]): Activity | null {
  // 1. 시간 필터링 (14일 이내)
  const recent = activities.filter(a => isWithin14Days(a.date));
  
  // 2. 가중치 계산
  const scored = recent.map(a => ({
    ...a,
    score: getActivityScore(a.type) + getRecencyBonus(a.date)
  }));
  
  // 3. 최고 점수 선택
  return scored.sort((a, b) => b.score - a.score)[0] || null;
}
```

---

### 기준 3: 최신성 보너스

**규칙:**
- 오늘 활동: +50점
- 어제 활동: +30점
- 3일 이내: +20점
- 7일 이내: +10점
- 14일 이내: +5점

**예시:**
```typescript
function getRecencyBonus(date: Date): number {
  const daysAgo = getDaysAgo(date);
  if (daysAgo === 0) return 50;
  if (daysAgo === 1) return 30;
  if (daysAgo <= 3) return 20;
  if (daysAgo <= 7) return 10;
  if (daysAgo <= 14) return 5;
  return 0;
}
```

---

## 3️⃣ 히어로 영역 표시 로직

### 케이스 A: 사진이 있는 경우 (최우선)

**표시:**
```
[사진 슬라이드 1~3장]
최근 경기: 7월 21일 (일)
이번 주 훈련 완료 (15명 참여)
```

**데이터 소스:**
1. `teams/{teamId}/photos` (최근 14일)
2. 일정과 연결된 사진
3. 없으면 AI 생성 썸네일 (종목 + 지역 기반)

---

### 케이스 B: 일정이 있는 경우

**표시:**
```
최근 경기: 7월 21일 (일) - 연습
이번 주 훈련 완료
```

**데이터 소스:**
- `teams/{teamId}/schedules` (최근 14일, `date` 내림차순)

---

### 케이스 C: 출석만 있는 경우

**표시:**
```
이번 주 훈련 완료 (15명 참여)
```

**데이터 소스:**
- `teams/{teamId}/attendance` (최근 14일, `date` 내림차순)

---

### 케이스 D: 블로그 포스트만 있는 경우

**표시:**
```
최근 글: "이번 주 경기 후기"
```

**데이터 소스:**
- `teams/{teamId}/blog_posts` (최근 14일, `publishedAt` 내림차순)

---

### 케이스 E: 활동이 없는 경우 (14일 초과)

**표시:**
```
최근 활동 정보를 준비 중입니다.
```

**또는 상태 뱃지 변경:**
- 🟡 모집 중 (활동 없어도 모집은 가능)

---

## 4️⃣ 상태 뱃지 결정 로직

### 🟢 활발한 팀
**조건:**
- 최근 14일 이내 활동 있음
- AND (일정 OR 출석 OR 블로그 포스트)

**표시:**
```
🟢 활발한 팀
```

---

### 🟡 모집 중
**조건:**
- 최근 14일 이내 활동 없음
- OR 멤버 수 < 최대 인원

**표시:**
```
🟡 모집 중
```

---

### ⚪ 비활성 (선택)
**조건:**
- 최근 30일 이내 활동 없음
- AND 멤버 수 = 0

**표시:**
```
⚪ 비활성
```

---

## 5️⃣ AI 이미지 생성 로직 (사진 없을 때)

### 생성 기준

**조건:**
- `teams/{teamId}/photos` 컬렉션이 비어있음
- OR 최근 14일 이내 사진 없음

**프롬프트:**
```
"{종목} 팀이 {지역}에서 {활동}하는 사진"
예: "축구 팀이 포천에서 경기하는 사진"
```

**생성 위치:**
- Storage: `teams/{teamId}/generated_photos/{date}.jpg`
- Firestore: `teams/{teamId}/photos/{photoId}` (메타데이터)

---

## 6️⃣ 코드 구현 예시

### 최근 활동 조회 함수

```typescript
async function getRecentActivity(teamId: string): Promise<RecentActivity | null> {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // 1. 사진 조회 (최우선)
  const photosRef = collection(db, `teams/${teamId}/photos`);
  const photosQuery = query(
    photosRef,
    where("uploadedAt", ">=", twoWeeksAgo),
    orderBy("uploadedAt", "desc"),
    limit(3)
  );
  const photosSnap = await getDocs(photosQuery);
  
  if (!photosSnap.empty) {
    const photos = photosSnap.docs.map(d => d.data());
    const latestSchedule = await getLatestSchedule(teamId, twoWeeksAgo);
    return {
      type: "photos",
      photos: photos.map(p => p.url),
      lastSchedule: latestSchedule,
      status: "active",
    };
  }

  // 2. 일정 조회
  const schedulesRef = collection(db, `teams/${teamId}/schedules`);
  const schedulesQuery = query(
    schedulesRef,
    where("date", ">=", twoWeeksAgo.toISOString().split("T")[0]),
    orderBy("date", "desc"),
    limit(1)
  );
  const schedulesSnap = await getDocs(schedulesQuery);
  
  if (!schedulesSnap.empty) {
    const schedule = schedulesSnap.docs[0].data();
    const attendance = await getLatestAttendance(teamId, twoWeeksAgo);
    return {
      type: "schedule",
      lastSchedule: {
        date: formatDate(schedule.date),
        event: schedule.event || schedule.title,
      },
      lastAttendance: attendance,
      status: "active",
    };
  }

  // 3. 출석만 있는 경우
  const attendance = await getLatestAttendance(teamId, twoWeeksAgo);
  if (attendance) {
    return {
      type: "attendance",
      lastAttendance: attendance,
      status: "active",
    };
  }

  // 4. 블로그 포스트만 있는 경우
  const postsRef = collection(db, `teams/${teamId}/blog_posts`);
  const postsQuery = query(
    postsRef,
    where("status", "==", "published"),
    where("publishedAt", ">=", twoWeeksAgo),
    orderBy("publishedAt", "desc"),
    limit(1)
  );
  const postsSnap = await getDocs(postsQuery);
  
  if (!postsSnap.empty) {
    const post = postsSnap.docs[0].data();
    return {
      type: "blog_post",
      lastPost: {
        title: post.title,
        publishedAt: formatDate(post.publishedAt),
      },
      status: "active",
    };
  }

  // 5. 활동 없음
  return {
    type: "none",
    status: "recruiting", // 모집 중으로 표시
  };
}
```

---

## 7️⃣ 상태 뱃지 결정 함수

```typescript
function determineTeamStatus(activity: RecentActivity | null): "active" | "recruiting" | "inactive" {
  if (!activity) return "recruiting";
  
  if (activity.status === "active") {
    return "active";
  }
  
  // 멤버 수 확인
  const memberCount = team.memberCount || 0;
  const maxMembers = team.maxMembers || 20;
  
  if (memberCount < maxMembers) {
    return "recruiting";
  }
  
  return "inactive";
}
```

---

## 8️⃣ 실제 사용 예시

### 예시 1: 활발한 팀 (사진 + 일정)

**데이터:**
- 사진: 3장 (7월 21일 경기)
- 일정: 7월 21일 (일) - 연습
- 출석: 15명

**표시:**
```
[사진 슬라이드]
🟢 활발한 팀
최근 경기: 7월 21일 (일) - 연습
이번 주 훈련 완료 (15명 참여)
```

---

### 예시 2: 모집 중 (활동 없음)

**데이터:**
- 최근 14일 이내 활동 없음
- 멤버 수: 12명 / 최대 20명

**표시:**
```
🟡 모집 중
최근 활동 정보를 준비 중입니다.
```

---

### 예시 3: 블로그만 있는 경우

**데이터:**
- 블로그 포스트: "이번 주 경기 후기" (7월 18일)

**표시:**
```
🟢 활발한 팀
최근 글: "이번 주 경기 후기"
```

---

## 9️⃣ 구현 체크리스트

### 프론트엔드

- [x] 최근 활동 조회 로직
- [x] 상태 뱃지 결정 로직
- [ ] 사진 슬라이드 UI (있을 때)
- [ ] AI 이미지 생성 연동 (없을 때)
- [ ] 활동 없음 상태 처리

### 백엔드 (선택)

- [ ] AI 이미지 생성 Cloud Function
- [ ] 최근 활동 자동 업데이트 스케줄
- [ ] 상태 뱃지 자동 갱신

---

## 🔟 다음 단계

1. 사진 슬라이드 UI 구현
2. AI 이미지 생성 Cloud Function
3. 상태 뱃지 자동 갱신 스케줄

