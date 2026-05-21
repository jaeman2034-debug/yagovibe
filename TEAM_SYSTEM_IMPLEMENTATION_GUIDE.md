# 🔥 팀 시스템 확장 구현 가이드

## 📋 구현 완료 항목

### ✅ Phase 1: 기본 설정
- [x] `src/lib/team/permissions.ts` - 권한 헬퍼 함수 구현
- [x] `src/components/team/TeamSettingsModal.tsx` - 팀 설정 모달 구현
- [x] `src/context/TeamContext.tsx` - 확장 필드 추가 (currentTeam, myRole, isOwner)

### ⏳ Phase 2: 초대 시스템 (기존 코드 활용)
- [x] `src/lib/team/teamInviteLink.ts` - 초대 링크 시스템 (이미 구현됨)
- [ ] 초대 링크 UI 개선 (선택사항)

### ⏳ Phase 3: 도메인 연결 (진행 중)
- [ ] Activity에 teamId 필수화
- [ ] 팀 활동 피드 구현
- [ ] 팀 채팅 연결
- [ ] 팀 이벤트 연결

---

## 🎯 다음 단계 구현 가이드

### 1️⃣ Activity에 teamId 필수화

#### 현재 구조
```typescript
// src/services/scheduleService.ts
export async function createSchedule(params: CreateScheduleParams): Promise<string> {
  // teamId는 이미 필수 파라미터로 있음 ✅
}
```

#### 수정 필요 사항
1. **일정 생성 시 팀 활동 자동 생성**
   ```typescript
   // src/services/scheduleService.ts 수정
   export async function createSchedule(params: CreateScheduleParams): Promise<string> {
     // ... 기존 일정 생성 코드 ...
     
     // 🔥 팀 활동 자동 생성
     await addDoc(collection(db, "teams", params.teamId, "activities"), {
       type: "schedule",
       title: params.title,
       scheduleId: scheduleRef.id,
       createdBy: params.creatorUid,
       createdAt: serverTimestamp(),
     });
     
     return scheduleRef.id;
   }
   ```

2. **ActivityFeed 쿼리 수정**
   ```typescript
   // src/features/activity/ActivityFeed.tsx 수정
   // teamId가 있는 경우 팀 활동만 조회
   if (teamId) {
     const teamActivitiesQuery = query(
       collection(db, "teams", teamId, "activities"),
       orderBy("createdAt", "desc"),
       limit(20)
     );
   }
   ```

---

### 2️⃣ 팀 홈 페이지 구현

#### 새 파일 생성
```typescript
// src/pages/team/TeamHomePage.tsx
export default function TeamHomePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { myTeam, myRole, isOwner } = useTeam();
  
  return (
    <div>
      {/* 팀 소개 */}
      <TeamIntro teamId={teamId} />
      
      {/* 팀 활동 피드 */}
      <TeamActivityFeed teamId={teamId} />
      
      {/* 팀 이벤트 */}
      <TeamEvents teamId={teamId} />
      
      {/* 팀 채팅 바로가기 */}
      <TeamChatLink teamId={teamId} />
    </div>
  );
}
```

#### 라우터 추가
```typescript
// src/App.tsx
<Route path="/teams/:teamId/home" element={<TeamHomePage />} />
```

---

### 3️⃣ 팀 활동 피드 구현

#### 새 컴포넌트
```typescript
// src/components/team/TeamActivityFeed.tsx
export function TeamActivityFeed({ teamId }: { teamId: string }) {
  const [activities, setActivities] = useState([]);
  
  useEffect(() => {
    const q = query(
      collection(db, "teams", teamId, "activities"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });
    
    return () => unsubscribe();
  }, [teamId]);
  
  return (
    <div>
      {activities.map(activity => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
```

---

### 4️⃣ 팀 채팅 연결

#### 채팅 방 생성 시 teamId 연결
```typescript
// src/pages/chat/ChatPage.tsx 수정
const createTeamChatRoom = async (teamId: string) => {
  await addDoc(collection(db, "chatRooms"), {
    teamId,
    type: "team",
    name: "팀 채팅",
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
};
```

---

## 🔧 사용 예시

### TeamSettingsModal 사용
```typescript
import { TeamSettingsModal } from "@/components/team/TeamSettingsModal";

function TeamPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { myTeam } = useTeam();
  
  return (
    <>
      <button onClick={() => setSettingsOpen(true)}>
        팀 설정
      </button>
      
      <TeamSettingsModal
        teamId={myTeam?.id || ""}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSuccess={() => {
          // 팀 정보 새로고침
          refreshTeam(myTeam?.sportType || "");
        }}
      />
    </>
  );
}
```

### 권한 체크 사용
```typescript
import { canEditTeam, canCreateActivity } from "@/lib/team/permissions";

async function checkPermissions() {
  const canEdit = await canEditTeam(userId, teamId);
  const canCreate = await canCreateActivity(userId, teamId);
  
  if (!canEdit) {
    toast.error("팀 수정 권한이 없습니다.");
    return;
  }
}
```

---

## 📝 Security Rules 업데이트

### teams/{teamId}/activities/{activityId}
```javascript
match /teams/{teamId}/activities/{activityId} {
  // 읽기: 팀 멤버 모두 가능
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  
  // 생성: 활성 멤버 모두 가능
  allow create: if request.auth != null && 
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.status == "active";
  
  // 수정/삭제: 생성자 또는 Owner/Admin만 가능
  allow update, delete: if request.auth != null && 
    (resource.data.createdBy == request.auth.uid ||
     request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []) ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
}
```

---

## 🎯 핵심 철학

> **활동은 이벤트가 아니라 팀에서 파생되는 도메인이다.**

팀이 없으면 활동도 없다.

---

## ✅ 체크리스트

- [x] 권한 헬퍼 함수 구현
- [x] TeamSettingsModal 구현
- [x] TeamContext 확장
- [ ] Activity에 teamId 필수화
- [ ] 팀 활동 피드 구현
- [ ] 팀 홈 페이지 구현
- [ ] 팀 채팅 연결
- [ ] Security Rules 업데이트
