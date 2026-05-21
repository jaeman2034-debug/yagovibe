# 🔥 선수 명단 입력 플로우 설계 (v1.1)

## 📍 전체 플로우

```
참가 신청 완료 (pending)
  ↓
협회 승인 (approved)
  ↓
팀장 초대 링크 발급
  ↓
팀장 로그인 → 선수 명단 등록
  ↓
선수 명단 제출 완료
```

## 🗂️ Firestore 스키마

### 선수 명단 컬렉션 구조

```
associations/{associationId}/tournaments/{tournamentId}/teams/{teamId}/rosters/{rosterId}/players/{playerId}
```

또는 (더 간단한 구조):

```
associations/{associationId}/tournaments/{tournamentId}/teams/{teamId}/players/{playerId}
```

### Player 문서 구조

```typescript
interface TournamentPlayer {
  id: string;
  teamId: string;
  tournamentId: string;
  associationId: string;
  
  // 기본 정보
  name: string;              // 선수 이름
  birthDate: string;        // 생년월일 (YYYY-MM-DD)
  position?: string;        // 포지션 (선택)
  phone?: string;            // 연락처 (선택)
  
  // 상태
  status: "active" | "inactive";  // 활성/비활성
  submitted: boolean;        // 제출 완료 여부
  submittedAt?: Timestamp;   // 제출 일시
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;         // 팀장 UID
}
```

## 🎨 UI 구조

### 1. 마이페이지 → 참가 내역 섹션

**위치**: `src/pages/me/MePage.tsx`

**추가할 섹션**:
```tsx
<section className="px-4 mt-6">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-base font-semibold text-gray-900">참가 내역</h2>
    <button
      onClick={() => navigate("/app/my/tournaments")}
      className="text-sm text-blue-600 hover:text-blue-700"
    >
      전체 보기 →
    </button>
  </div>
  
  {/* 참가 신청 목록 (최근 3개) */}
  {myApplications.map((app) => (
    <TournamentApplicationCard 
      key={app.id}
      application={app}
      onClick={() => navigate(`/app/my/tournaments/${app.tournamentId}/teams/${app.teamId}/roster`)}
    />
  ))}
</section>
```

### 2. 참가 내역 상세 페이지

**경로**: `/app/my/tournaments`

**기능**:
- 사용자가 신청한 모든 대회 목록
- 각 대회별 상태 (대기/승인/반려)
- 선수 명단 제출 여부
- 선수 명단 관리 버튼

### 3. 선수 명단 관리 페이지

**경로**: `/app/my/tournaments/{tournamentId}/teams/{teamId}/roster`

**기능**:
- 선수 목록 표시 (이름, 생년월일, 포지션, 연락처)
- 선수 추가 버튼
- 선수 수정/삭제
- 제출 버튼 (마감일 전까지 수정 가능)

**상태별 UI**:
- **승인 전 (pending)**: "승인 후 선수 명단을 등록할 수 있습니다"
- **승인 후 (approved)**: 선수 명단 입력 UI 활성화
- **제출 완료**: 읽기 전용 모드, "제출 완료" 배지

## 🔐 Firestore Rules

```javascript
// 선수 명단 컬렉션
match /associations/{associationId}/tournaments/{tournamentId}/teams/{teamId}/players/{playerId} {
  // 읽기: 팀장 또는 관리자
  allow read: if isSignedIn() && (
    isAssociationAdmin(associationId) ||
    isTeamCaptain(teamId)
  );
  
  // 생성: 팀장만 (승인된 팀만)
  allow create: if isSignedIn() && 
    isTeamCaptain(teamId) &&
    isTeamApproved(associationId, tournamentId, teamId);
  
  // 수정: 팀장만 (제출 전까지)
  allow update: if isSignedIn() && 
    isTeamCaptain(teamId) &&
    !resource.data.submitted;
  
  // 삭제: 팀장만 (제출 전까지)
  allow delete: if isSignedIn() && 
    isTeamCaptain(teamId) &&
    !resource.data.submitted;
}
```

## 📝 구현 순서

1. ✅ 마이페이지에 "참가 내역" 섹션 추가
2. ✅ 참가 내역 조회 Hook 생성 (`useMyTournamentApplications`)
3. ✅ 선수 명단 관리 페이지 생성
4. ✅ 선수 명단 Repository 생성 (`playerRepository.ts`)
5. ✅ Firestore Rules 추가
6. ✅ 선수 명단 입력/수정 UI 구현
