# 🗓 일정 탭 API 스펙

## 📋 개요

일정 탭의 데이터 구조, 쿼리 규칙, 권한 분기를 정의합니다.

---

## 1️⃣ 데이터 모델

### 컬렉션: `schedules/{scheduleId}`

```typescript
interface Schedule {
  id: string;
  teamId: string;
  type: "경기" | "훈련" | "친선";
  title: string;
  dateTime: Timestamp; // Firestore Timestamp
  place: string;
  placeCoordinates?: {
    lat: number;
    lng: number;
  };
  opponent?: string; // 경기/친선만
  isPublic: boolean; // 공개 여부
  needsSubstitute: boolean; // 용병 모집
  description?: string;
  creatorId: string; // 생성자 UID
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  
  // 참석 응답
  attendance?: {
    [userId: string]: "참석" | "불참" | "미정";
  };
}
```

---

## 2️⃣ 쿼리 규칙

### 일정 목록 조회

```typescript
// 기본 쿼리
const q = query(
  collection(db, "schedules"),
  where("teamId", "==", teamId),
  orderBy("dateTime", "desc")
);

// 필터 적용 (클라이언트)
const filtered = schedules.filter((schedule) => {
  if (filter === "all") return true;
  if (filter === "today") {
    const scheduleDate = schedule.dateTime.toDate();
    const today = new Date();
    return scheduleDate.toDateString() === today.toDateString();
  }
  return schedule.type === filter;
});
```

### 인덱스 필요

```json
{
  "indexes": [
    {
      "collectionGroup": "schedules",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "dateTime", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 3️⃣ 권한 분기

| 역할 | 생성 | 수정 | 삭제 | 조회 |
|------|------|------|------|------|
| 운영자 | ✔ | ✔ | ✔ | ✔ |
| 멤버 | ❌ | ❌ | ❌ | ✔ |
| 외부 | ❌ | ❌ | ❌ | 공개만 |

### 권한 체크 함수

```typescript
// src/lib/schedules/permissions.ts
export function canCreateSchedule(
  user: { uid: string } | null,
  team: Team | null,
  teamMember: TeamMember | null
): boolean {
  if (!user || !team || !teamMember) return false;
  
  // 팀 소유자
  if (user.uid === team.ownerId) return true;
  
  // 관리자 (accessLevel이 OWNER 또는 ADMIN)
  if (teamMember.accessLevel === 'OWNER' || teamMember.accessLevel === 'ADMIN') {
    return true;
  }
  
  return false;
}
```

---

## 4️⃣ API 엔드포인트

### 일정 생성

```typescript
// POST /schedules
await addDoc(collection(db, "schedules"), {
  teamId,
  type: formData.type,
  title: formData.title.trim(),
  dateTime: formData.dateTime,
  place: formData.place.trim(),
  placeCoordinates: formData.placeCoordinates,
  opponent: formData.opponent?.trim(),
  isPublic: formData.isPublic,
  needsSubstitute: formData.needsSubstitute,
  description: formData.description?.trim(),
  creatorId: user.uid,
  createdAt: serverTimestamp(),
});
```

### 일정 수정

```typescript
// PATCH /schedules/{scheduleId}
await updateDoc(doc(db, "schedules", scheduleId), {
  ...updates,
  updatedAt: serverTimestamp(),
});
```

### 일정 삭제

```typescript
// DELETE /schedules/{scheduleId}
await deleteDoc(doc(db, "schedules", scheduleId));
```

### 참석 응답

```typescript
// PATCH /schedules/{scheduleId}/attendance
await updateDoc(doc(db, "schedules", scheduleId), {
  [`attendance.${userId}`]: response, // "참석" | "불참" | "미정"
  updatedAt: serverTimestamp(),
});
```

---

## 5️⃣ 알림 트리거

### 일정 생성 시

```typescript
// 대상: 팀 멤버 전체 (운영자 제외)
// 우선순위: normal (당일 일정이면 high)
// 타입: TEAM_SCHEDULE_CREATED
```

### 일정 변경 시

```typescript
// 대상: 참석/미응답 멤버
// 우선순위: high
// 타입: TEAM_SCHEDULE_UPDATED
```

### 리마인드

```typescript
// D-1 20:00 (normal)
// D-0 2시간 전 (high)
// 타입: TEAM_SCHEDULE_REMINDER
```

---

## 6️⃣ 에러 처리

### 권한 없음

```typescript
if (!canCreate) {
  return {
    error: "UNAUTHORIZED",
    message: "일정을 생성할 권한이 없습니다",
  };
}
```

### 유효성 검증

```typescript
if (!formData.title.trim() || !formData.place.trim()) {
  return {
    error: "VALIDATION_ERROR",
    message: "제목과 장소는 필수입니다",
  };
}
```

---

## 7️⃣ 성능 최적화

### 실시간 구독

```typescript
// onSnapshot 사용 (실시간 업데이트)
const unsubscribe = onSnapshot(q, (snapshot) => {
  const list = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Schedule[];
  setSchedules(list);
});
```

### 캐싱

- 일정 목록은 실시간 구독으로 항상 최신 상태 유지
- 필터링은 클라이언트에서 처리 (서버 부하 감소)

---

## 8️⃣ 보안 규칙

```javascript
// Firestore Security Rules
match /schedules/{scheduleId} {
  // 읽기: 팀 멤버 또는 공개 일정
  allow read: if request.auth != null && (
    resource.data.teamId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teams ||
    resource.data.isPublic == true
  );
  
  // 생성: 팀 운영자만
  allow create: if request.auth != null && 
    request.auth.uid == get(/databases/$(database)/documents/teams/$(resource.data.teamId)).data.ownerUid;
  
  // 수정/삭제: 생성자 또는 팀 운영자만
  allow update, delete: if request.auth != null && (
    request.auth.uid == resource.data.creatorId ||
    request.auth.uid == get(/databases/$(database)/documents/teams/$(resource.data.teamId)).data.ownerUid
  );
}
```
