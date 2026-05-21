# 🔐 QR 초대 권한/보안 설계 (천재 버전)

## 📋 목표

QR 기반 회원가입의 보안 통제 및 권한 관리 체계 확립

---

## 1️⃣ QR 초대 토큰 구조

### Firestore: `invite_tokens/{tokenId}`

```typescript
{
  // 기본 정보
  tokenId: string;              // 고유 토큰 ID (예: "abc123def456")
  teamId: string;               // 팀 ID
  createdBy: string;            // 생성자 UID (코치/관리자)
  
  // 초대 컨텍스트
  role: "member" | "coach" | "staff";  // 초대 역할
  context: "on-site" | "online";       // 현장용 / 온라인용
  
  // 만료 전략
  expiresAt: Timestamp;         // 만료 시간
  maxUses?: number;             // 최대 사용 횟수 (온라인용)
  usedCount: number;            // 현재 사용 횟수
  
  // 보안
  isActive: boolean;            // 활성화 여부
  revokedAt?: Timestamp;       // 수동 취소 시간
  
  // 메타데이터
  createdAt: Timestamp;
  lastUsedAt?: Timestamp;
  usedBy?: string[];            // 사용한 UID 목록 (중복 방지)
}
```

### 토큰 생성 규칙

**현장용 QR (`context: "on-site"`)**
- `expiresAt`: 생성 후 1시간
- `maxUses`: 1 (단일 사용)
- `usedBy`: 사용 즉시 비활성화

**온라인용 QR (`context: "online"`)**
- `expiresAt`: 생성 후 30일
- `maxUses`: 100 (또는 무제한)
- `usedBy`: 사용 기록만 저장 (재사용 가능)

---

## 2️⃣ 만료 시간 전략

### 현장용 QR (On-Site)

**시나리오**
- 훈련장/경기장에서 즉시 스캔
- 코치가 직접 배포
- 단일 이벤트용

**만료 전략**
```typescript
{
  expiresAt: Timestamp.fromDate(
    new Date(Date.now() + 60 * 60 * 1000) // 1시간
  ),
  maxUses: 1,
  context: "on-site"
}
```

**이유**
- 현장에서 즉시 사용
- 오후 사용 방지
- 보안 강화

### 온라인용 QR (Online)

**시나리오**
- 팀 블로그/웹사이트 공유
- SNS 공유
- 장기 모집

**만료 전략**
```typescript
{
  expiresAt: Timestamp.fromDate(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일
  ),
  maxUses: 100, // 또는 null (무제한)
  context: "online"
}
```

**이유**
- 장기 모집 필요
- 여러 사람이 사용 가능
- 편의성 우선

---

## 3️⃣ 역할 스코프 (Role Scope)

### 역할별 권한

| 역할 | 설명 | QR 생성 가능 |
|------|------|-------------|
| `member` | 일반 팀원 | ❌ |
| `coach` | 코치 | ✅ (member, staff) |
| `staff` | 스태프 | ✅ (member) |
| `admin` | 관리자 | ✅ (모든 역할) |
| `owner` | 팀 소유자 | ✅ (모든 역할) |

### 역할 제한 규칙

**QR 생성 시**
- `coach`는 `member`, `staff`만 초대 가능
- `admin`/`owner`는 모든 역할 초대 가능
- `member`는 QR 생성 불가

**QR 사용 시**
- QR에 지정된 역할로만 가입
- 역할 상향 불가 (보안)

---

## 4️⃣ 기존 계정 재사용 로직

### 케이스 A: 기존 계정 + QR 스캔

**플로우**
1. QR 스캔 → 팀 미리보기
2. 로그인 확인 → 이미 로그인됨
3. 팀 합류 처리 (`joinTeam` 호출)
4. 중복 가입 체크 → 이미 멤버면 에러

**처리 로직**
```typescript
// QRTeamPreviewPage.tsx
if (user) {
  // 기존 계정 → 바로 합류
  navigate(`/qr/join?teamId=${teamId}&role=${role}`);
} else {
  // 신규 → 회원가입
  navigate('/qr/signup', { state: { teamId, role, teamName } });
}
```

### 케이스 B: 신규 계정 + QR 스캔

**플로우**
1. QR 스캔 → 팀 미리보기
2. 로그인 확인 → 비로그인
3. 회원가입 → 최소 입력
4. 가입 완료 → 팀 합류

---

## 5️⃣ 악용 방지 시나리오

### 시나리오 1: 만료된 QR 사용

**방어**
```typescript
// QRTeamPreviewPage.tsx
const tokenDoc = await getDoc(doc(db, 'invite_tokens', tokenId));
const tokenData = tokenDoc.data();

if (!tokenData || tokenData.expiresAt.toDate() < new Date()) {
  throw new Error('만료된 초대입니다.');
}
```

### 시나리오 2: 중복 사용 (현장용)

**방어**
```typescript
if (tokenData.context === 'on-site' && tokenData.usedBy?.length > 0) {
  throw new Error('이미 사용된 초대입니다.');
}
```

### 시나리오 3: 최대 사용 횟수 초과 (온라인용)

**방어**
```typescript
if (tokenData.maxUses && tokenData.usedCount >= tokenData.maxUses) {
  throw new Error('초대 사용 횟수를 초과했습니다.');
}
```

### 시나리오 4: 비활성화된 토큰

**방어**
```typescript
if (!tokenData.isActive || tokenData.revokedAt) {
  throw new Error('취소된 초대입니다.');
}
```

### 시나리오 5: 역할 상향 시도

**방어**
```typescript
// joinTeam.ts (이미 구현됨)
if (role === "admin") {
  throw new HttpsError("permission-denied", "admin 권한은 팀 생성 시에만 부여됩니다.");
}
```

---

## 6️⃣ QR 토큰 생성 Cloud Function

### `generateInviteToken`

```typescript
interface GenerateInviteTokenRequest {
  teamId: string;
  role: "member" | "coach" | "staff";
  context: "on-site" | "online";
  maxUses?: number;  // 온라인용만
  expiresInHours?: number;  // 커스텀 만료 시간
}

interface GenerateInviteTokenResponse {
  tokenId: string;
  qrUrl: string;  // qr.yago.app/invite?token={tokenId}
  expiresAt: Timestamp;
}
```

**검증 규칙**
1. 생성자 권한 확인 (coach/admin/owner)
2. 역할 제한 확인
3. 토큰 생성 및 저장
4. QR URL 반환

---

## 7️⃣ QR 토큰 검증 Cloud Function

### `verifyInviteToken`

```typescript
interface VerifyInviteTokenRequest {
  tokenId: string;
}

interface VerifyInviteTokenResponse {
  valid: boolean;
  teamId?: string;
  role?: string;
  teamName?: string;
  error?: string;
}
```

**검증 단계**
1. 토큰 존재 확인
2. 만료 시간 확인
3. 활성화 상태 확인
4. 사용 횟수 확인 (온라인용)
5. 팀 정보 반환

---

## 8️⃣ QR 토큰 사용 기록

### 사용 시 자동 업데이트

```typescript
// QRJoinCompletePage.tsx 또는 joinTeam.ts
await updateDoc(doc(db, 'invite_tokens', tokenId), {
  usedCount: admin.firestore.FieldValue.increment(1),
  lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
  usedBy: admin.firestore.FieldValue.arrayUnion(uid),
  // 현장용은 즉시 비활성화
  ...(context === 'on-site' && { isActive: false }),
});
```

---

## 9️⃣ 보안 체크리스트

### 필수 검증 항목

- [x] 토큰 존재 확인
- [x] 만료 시간 확인
- [x] 활성화 상태 확인
- [x] 사용 횟수 확인 (온라인용)
- [x] 중복 사용 방지 (현장용)
- [x] 역할 제한 확인
- [x] 팀 상태 확인 (active/inactive)
- [x] 생성자 권한 확인

---

## 🔟 구현 우선순위

### Phase 1: 기본 구조
1. `invite_tokens` 컬렉션 구조 정의
2. `generateInviteToken` Cloud Function
3. `verifyInviteToken` Cloud Function
4. QRTeamPreviewPage에서 토큰 검증

### Phase 2: 보안 강화
1. 만료 시간 검증
2. 사용 횟수 제한
3. 중복 사용 방지
4. 토큰 취소 기능

### Phase 3: 고급 기능
1. 토큰 사용 통계
2. 토큰 만료 알림
3. 자동 토큰 정리 (만료된 토큰 삭제)

---

## 🎯 최종 원칙 (LOCK)

1. **현장용 = 단기 + 단일 사용**
2. **온라인용 = 장기 + 재사용 가능**
3. **역할은 QR 생성 시 고정, 변경 불가**
4. **모든 검증은 서버(Cloud Function)에서 수행**
5. **기존 계정은 재사용, 신규는 최소 입력**

