# 3️⃣ 팀원 초대 링크 방식 (v2) – 설계 문서

## 🎯 목표

- 팀장이 링크 하나 공유
- 팀원은 각자 정보 직접 입력
- 운영자는 명단 취합 스트레스 0
- **v1 구조(팀장 입력 방식)와 완전 공존**

## 1️⃣ 기본 개념 (중요한 철학)

### v1 (현재) - 팀장 직접 입력
- **팀장 → 선수 명단 직접 입력**
- 빠르고 통제 쉬움
- 소규모 팀 / 빠른 등록에 최적

### v2 (확장) - 팀원 초대 링크
- **팀장 → 초대 링크 공유**
- **팀원 → 본인 정보 직접 입력**
- 대규모 팀 / 분산 입력에 최적

### 👉 설계 원칙
- **둘 다 유지**
- **팀장 선택권 제공 = 현실 최적**
- v1 구조 전혀 안 부숨

## 2️⃣ 전체 플로우 한눈에

```
팀장
 └ 선수 명단 관리
    └ [ 팀원 초대 링크 생성 ]
        ↓
https://yago.app/invite/abc123
        ↓
팀원
 └ 선수 정보 입력 (회원가입 ❌)
        ↓
명단 자동 반영 (대기 상태)
        ↓
팀장 승인
        ↓
최종 확정
```

## 3️⃣ 데이터 모델 설계 (핵심)

### 📂 invites 컬렉션 (새로 추가)

```
invites/{inviteId}
  - applicationId: string        // 참가 신청 ID (선수 귀속)
  - associationId: string        // SaaS 멀티 테넌트
  - tournamentId: string         // 대회 ID
  - role: "player"               // 고정 값
  - expiresAt: Timestamp         // 만료 시간 (7일)
  - maxUses: number              // 최대 사용 횟수 (15명)
  - usedCount: number            // 현재 사용 횟수
  - createdBy: string            // 팀장 UID
  - createdAt: Timestamp
  - updatedAt: Timestamp
```

### 📂 players 컬렉션 (기존 구조 유지)

```
rosters/{applicationId}/players/{playerId}
  - name: string
  - birthDate: string
  - position?: string
  - phone?: string
  - status: "draft" | "pending" | "confirmed"  // 👈 새로 추가
  - invitedBy?: string                         // 👈 inviteId (추적용)
  - invitedAt?: Timestamp                      // 👈 초대 시점
  - createdAt: Timestamp
```

### 👉 핵심 포인트
- **applicationId 기준으로 선수 귀속**
- **status 필드로 승인 상태 관리**
- **v1 직접 입력: status = "confirmed"**
- **v2 초대 입력: status = "pending" (승인 대기)**

## 4️⃣ 초대 링크 생성 (팀장 액션)

### UI 컴포넌트 위치
- **마이페이지 → 참가 내역 → 선수 명단 관리**
- **"팀원 초대 링크 생성" 버튼 추가**

### 생성 로직 (Cloud Function 권장)

```typescript
// functions/src/tournament/createTeamInvite.ts
export const createTeamInvite = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 30,
  },
  async (request) => {
    const { applicationId, maxUses = 15 } = request.data;
    const uid = request.auth.uid;

    // 1. 권한 확인 (팀장인지 확인)
    const application = await getApplication(applicationId);
    if (application.teamManagerId !== uid) {
      throw new HttpsError("permission-denied", "권한 없음");
    }

    // 2. 초대 링크 생성
    const inviteId = nanoid();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일
    );

    await setDoc(doc(db, "invites", inviteId), {
      applicationId,
      associationId: application.associationId,
      tournamentId: application.tournamentId,
      role: "player",
      expiresAt,
      maxUses,
      usedCount: 0,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 3. 초대 URL 반환
    return {
      inviteId,
      url: `https://yago.app/invite/${inviteId}`,
      expiresAt: expiresAt.toDate(),
      maxUses,
    };
  }
);
```

### 👉 보안 포인트
- **링크 만료 (7일)**
- **인원 제한 (최대 15명)**
- **팀장 권한 확인 필수**

## 5️⃣ 초대 링크 접속 UX (팀원 화면)

### URL 구조
```
/invite/:inviteId
```

### 화면 카피 (중요)
```
노원구 협회장기 축구대회

불암FC 선수 등록

본인 정보를 입력해주세요.
(팀장 승인 후 최종 확정됩니다)
```

### UI 컴포넌트 구조

```typescript
// src/pages/invite/PlayerInvitePage.tsx
export function PlayerInvitePage() {
  const { inviteId } = useParams();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);

  // 초대 정보 조회
  useEffect(() => {
    // invite 정보 + application 정보 + tournament 정보 조회
  }, [inviteId]);

  // 만료/만찬 체크
  if (invite?.expiresAt < now()) {
    return <ExpiredMessage />;
  }
  if (invite?.usedCount >= invite?.maxUses) {
    return <FullMessage />;
  }

  return <PlayerRegistrationForm invite={invite} />;
}
```

## 6️⃣ 팀원 입력 폼 (최소 필수)

### 필드 구성

```
이름 *
[__________]

생년월일 *
[ YYYY-MM-DD ]

포지션 (선택)
[ GK / DF / MF / FW ]

연락처 (선택)
[ 010-____-____ ]

[ 등록하기 ]
```

### UX 원칙
- **회원가입 ❌**
- **로그인 ❌**
- **입력 허들 최소화**
- **필수값: 이름 + 생년월일만**

## 7️⃣ 제출 시 처리 로직

### Cloud Function (보안 필수)

```typescript
// functions/src/tournament/submitPlayerViaInvite.ts
export const submitPlayerViaInvite = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 30,
  },
  async (request) => {
    const { inviteId, playerData } = request.data;

    // 1. 초대 링크 조회
    const invite = await getInvite(inviteId);
    if (!invite) {
      throw new HttpsError("not-found", "초대 링크를 찾을 수 없습니다");
    }

    // 2. 만료 체크
    if (invite.expiresAt.toDate() < new Date()) {
      throw new HttpsError("deadline-exceeded", "초대 링크가 만료되었습니다");
    }

    // 3. 사용 횟수 체크
    if (invite.usedCount >= invite.maxUses) {
      throw new HttpsError("resource-exhausted", "인원이 가득 찼습니다");
    }

    // 4. 선수 정보 저장 (대기 상태)
    const playerRef = doc(
      collection(
        db,
        `associations/${invite.associationId}/tournaments/${invite.tournamentId}/applications/${invite.applicationId}/rosters/${invite.applicationId}/players`
      )
    );

    await setDoc(playerRef, {
      ...sanitizeForFirestore(playerData),
      status: "pending", // 👈 승인 대기 상태
      invitedBy: inviteId,
      invitedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    // 5. 사용 횟수 증가
    await updateDoc(doc(db, "invites", inviteId), {
      usedCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  }
);
```

### 👉 보안 포인트
- **프론트에서 직접 players 쓰기 ❌**
- **서버 검증 필수**
- **만료/만찬 체크 이중 방어**

## 8️⃣ 팀장 승인 UX (통제 유지)

### 선수 명단 관리 화면 업데이트

```typescript
// src/components/roster/PlayerManagement.tsx

// 대기 중 선수 목록
const pendingPlayers = players.filter(p => p.status === "pending");

return (
  <div>
    {/* 승인된 선수 */}
    <div>
      <h3>등록된 선수 ({confirmedPlayers.length}명)</h3>
      {/* 기존 리스트 */}
    </div>

    {/* 대기 중 선수 (v2 초대) */}
    {pendingPlayers.length > 0 && (
      <div className="mt-4">
        <h3>대기 중 선수 ({pendingPlayers.length}명)</h3>
        {pendingPlayers.map(player => (
          <div key={player.id}>
            <span>{player.name} | {player.position}</span>
            <Button onClick={() => approvePlayer(player.id)}>승인</Button>
            <Button onClick={() => rejectPlayer(player.id)}>거절</Button>
          </div>
        ))}
      </div>
    )}
  </div>
);
```

### 승인 로직

```typescript
// Cloud Function 또는 직접 updateDoc
await updateDoc(playerRef, {
  status: "confirmed",
  approvedAt: serverTimestamp(),
  approvedBy: teamManagerId,
});
```

### 👉 승인 후에만
- **선수 상태 → confirmed**
- **명단 제출 가능**

## 9️⃣ Firestore Rules 개념

### invites Rules

```javascript
match /invites/{inviteId} {
  // 읽기: 누구나 (링크 접근용)
  allow read: if true;

  // 생성: 팀장만
  allow create: if 
    request.auth != null &&
    request.resource.data.createdBy == request.auth.uid;

  // 수정: 팀장만 (usedCount 증가용)
  allow update: if 
    request.auth != null &&
    resource.data.createdBy == request.auth.uid;
}
```

### players Rules (기존 + 확장)

```javascript
match /rosters/{applicationId}/players/{playerId} {
  // 읽기: 팀장 + 운영자
  allow read: if 
    isTeamManager(applicationId) ||
    isAssociationAdmin(application(applicationId).associationId);

  // 생성: 
  // - 팀장 직접 입력 (status = "confirmed")
  // - Cloud Function 통한 초대 입력 (status = "pending")
  allow create: if 
    (isTeamManager(applicationId) && 
     request.resource.data.status == "confirmed") ||
    // Cloud Function은 서버 권한으로 처리
    false; // 일반 사용자는 직접 생성 불가

  // 수정: 팀장만 (status 변경)
  allow update: if 
    isTeamManager(applicationId) &&
    request.resource.data.status in ["pending", "confirmed"];
}
```

### 👉 핵심
- **invites 읽기: 누구나**
- **invites 쓰기: 팀장만**
- **players 생성: 팀장 직접 입력 ⭕ / Cloud Function 통한 입력 ⭕**
- **Rules 단순 유지**

## 🔟 왜 이 설계가 적절한가

### ✅ 장점

1. **팀장 부담 강요 안 함**
   - v1 직접 입력 vs v2 초대 링크 선택권 제공
   - 팀 규모/상황에 맞게 선택

2. **팀원 회원가입 강요 안 함**
   - 입력 허들 최소화
   - 접근성 극대화

3. **실제 동호회/대회 운영 현실 반영**
   - 팀장이 링크 공유하는 방식
   - 카톡/문자로 링크 전달

4. **나중에 선수 개인 서비스로 확장 가능**
   - 선수별 프로필 연동 가능
   - 통계/기록 추적 가능

5. **v1 구조 전혀 안 부숨**
   - 기존 코드 재사용
   - 점진적 확장 가능

## 🔥 한 줄 결론

**"입력은 분산하고, 통제는 유지한다."**

이게 팀원 초대의 정답 구조다.

## 📋 구현 체크리스트

### Phase 1: 데이터 모델
- [ ] `invites` 컬렉션 스키마 정의
- [ ] `players.status` 필드 추가
- [ ] Firestore Rules 업데이트

### Phase 2: Cloud Functions
- [ ] `createTeamInvite` 함수 구현
- [ ] `submitPlayerViaInvite` 함수 구현
- [ ] 만료/만찬 체크 로직

### Phase 3: 프론트엔드 (팀장)
- [ ] 선수 명단 관리에 "초대 링크 생성" 버튼 추가
- [ ] 초대 링크 생성 모달/화면
- [ ] 초대 링크 복사/공유 UX
- [ ] 대기 중 선수 목록 표시
- [ ] 선수 승인/거절 기능

### Phase 4: 프론트엔드 (팀원)
- [ ] `/invite/:inviteId` 라우트 추가
- [ ] 초대 링크 접속 페이지
- [ ] 선수 정보 입력 폼
- [ ] 만료/만찬 안내 화면
- [ ] 제출 완료 확인 화면

### Phase 5: 통합 테스트
- [ ] v1 직접 입력 + v2 초대 링크 동시 사용 테스트
- [ ] 초대 링크 만료/만찬 테스트
- [ ] 팀장 승인 플로우 테스트
- [ ] 권한 체크 테스트

## 🚀 다음 단계

이제 남은 건 선택이 아니라 정리야.

다음 중 하나로 마무리할 수 있어:

1. **🚀 v1 출시 체크리스트 + 배포 시나리오**
2. **📐 전체 시스템 아키텍처 한 장 요약**
3. **🧪 실서비스 QA 테스트 시나리오**

👉 어디까지 갈지 선택해주세요.
