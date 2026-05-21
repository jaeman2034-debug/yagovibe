# 🔐 QR 초대 시스템 v1 LOCK (최종 확정)

## 📋 핵심 원칙 (절대 변경 금지)

1. **QR에는 inviteId만 포함** (팀 정보 직접 노출 금지)
2. **서버에서만 합류 처리** (클라이언트 직접 쓰기 차단)
3. **coach/staff 이상만 초대 생성 가능**
4. **현장용(24시간, 1회) / 온라인용(30일, 50~200회) 구분**

---

## 1️⃣ QR 형식

### QR URL
```
https://yagovibe.com/qr?invite=INV_xxxxx
```

### 규칙
- QR에는 **inviteId만** 포함
- 팀ID, 권한, 유저정보는 QR에 절대 포함 금지
- 서버에서 inviteId로 조회 후 검증

---

## 2️⃣ Firestore 구조

### `/invites/{inviteId}`

```typescript
type InviteDoc = {
  teamId: string;                // 합류할 팀
  role: "member" | "coach" | "staff";
  createdByUid: string;

  // 만료/재사용 정책
  expiresAt: Timestamp;          // 필수
  maxUses: number;               // 1(기본) or n
  usedCount: number;             // 증가
  revoked: boolean;              // 강제 폐기

  // 환경 정책(선택)
  allowExistingUser: boolean;    // 기존 로그인 유저도 합류 허용
  allowNewSignup: boolean;       // 신규 가입 유도 허용

  // 감사/추적
  createdAt: Timestamp;
  lastUsedAt?: Timestamp;
  lastUsedByUid?: string;
  lastUsedUa?: string;           // user-agent(옵션)
  version: 1;
};
```

### `/teams/{teamId}/members/{uid}`

```typescript
type TeamMemberDoc = {
  uid: string;
  role: "member" | "coach" | "staff";
  joinedAt: Timestamp;
  joinedVia: "invite";
  inviteId: string; // 🔥 초대 추적
  status: "active";
};
```

---

## 3️⃣ 정책 (디폴트)

### 현장용 QR (기본)
- `expiresAt`: 생성 시점 + 24시간
- `maxUses`: 1
- `role`: 기본 member
- `allowExistingUser`: true
- `allowNewSignup`: true

### 온라인용 QR (옵션)
- `expiresAt`: 생성 시점 + 30일
- `maxUses`: 50~200
- `role`: 지정 가능
- 생성 권한: coach/staff 이상

---

## 4️⃣ Cloud Functions

### `createInvite`
- **역할**: QR 초대 토큰 생성
- **권한**: coach/staff 이상만 가능
- **반환**: `{ inviteId, qrUrl, expiresAt, maxUses }`

### `verifyInvite`
- **역할**: inviteId 검증 및 팀 정보 반환
- **권한**: 인증 불필요 (공개 검증)
- **반환**: `{ valid, teamId, role, teamName, ... }`

### `joinTeam`
- **역할**: inviteId로 팀 합류 처리
- **권한**: 로그인 필수
- **검증 순서**:
  1. auth 체크
  2. invite 조회
  3. revoked / expiresAt / maxUses 검증
  4. 이미 멤버인지 확인 (idempotent)
  5. 트랜잭션으로 members/{uid} 생성 + invite.usedCount 증가

---

## 5️⃣ Firestore Security Rules

```javascript
match /invites/{inviteId} {
  // 읽기: 인증된 사용자 모두 가능 (팀 미리보기용)
  allow read: if isSignedIn();
  
  // 쓰기: 서버만 가능 (Cloud Functions만 생성/수정)
  allow write: if false; // 🔒 핵심: 클라이언트 직접 쓰기 차단
}
```

---

## 6️⃣ 프론트엔드 플로우

### QRScannerPage
- QR 스캔 → `invite` 파라미터 추출
- `/qr/preview?invite=INV_xxxxx`로 이동

### QRTeamPreviewPage
- `verifyInvite` 호출 → 팀 정보 표시
- 로그인 상태면 "팀 합류" 버튼
- 비로그인이면 "가입하고 합류" 버튼

### QRSignupPage
- 회원가입 완료 → inviteId 유지
- `/qr/complete`로 이동 (inviteId 전달)

### QRJoinCompletePage
- `joinTeam({ inviteId })` 호출
- 에러 코드를 사용자 친화적 메시지로 변환

---

## 7️⃣ 에러 코드 매핑

| 에러 코드 | UX 메시지 |
|----------|----------|
| `INVITE_NOT_FOUND` | "초대코드가 유효하지 않아요" |
| `INVITE_EXPIRED` | "초대가 만료됐어요. 새 QR을 받아주세요" |
| `INVITE_USED_UP` | "이미 사용된 초대코드예요" |
| `INVITE_REVOKED` | "초대가 취소되었어요" |
| `AUTH_REQUIRED` | "로그인 후 다시 시도해주세요" |
| `TEAM_NOT_FOUND` | "팀을 찾을 수 없습니다" |
| `TEAM_INACTIVE` | "비활성화된 팀입니다" |

---

## 8️⃣ 보안 체크리스트

- [x] QR에 inviteId만 포함 (팀 정보 직접 노출 금지)
- [x] 클라이언트 직접 쓰기 차단 (Security Rules)
- [x] 서버에서만 합류 처리 (joinTeam Function)
- [x] 만료 시간 검증
- [x] 사용 횟수 제한
- [x] 중복 사용 방지 (idempotent 처리)
- [x] 역할 제한 확인
- [x] 팀 상태 확인

---

## 9️⃣ 구현 파일

### Cloud Functions
- `functions/src/createInvite.ts`
- `functions/src/verifyInvite.ts`
- `functions/src/joinTeam.ts` (v1 LOCK - inviteId 기반)

### 프론트엔드
- `src/pages/qr/QRScannerPage.tsx`
- `src/pages/qr/QRTeamPreviewPage.tsx`
- `src/pages/qr/QRSignupPage.tsx`
- `src/pages/qr/QRJoinCompletePage.tsx`

### 보안
- `firestore.rules` (invites 컬렉션 보안 규칙)

---

## 🔟 다음 단계 (선택)

- [ ] "상시 QR" vs "현장 QR" 2종 템플릿 정책 LOCK
- [ ] QR 생성 UI (팀 관리 페이지)
- [ ] QR 사용 통계 대시보드

