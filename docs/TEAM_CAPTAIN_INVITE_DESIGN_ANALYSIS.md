# 🔥 팀장 초대 링크 설계 분석 및 구현 상태

## 📋 설계 요구사항 vs 현재 구현 상태

### 0️⃣ 이 설계의 목표

**요구사항:**
- 팀원 등록 책임을 100% 팀장에게 위임
- 운영자 개입 0
- 실수/오남용/중복 접근 차단
- 감사 로그 완전 확보

**현재 상태:** ✅ 기본 구조는 구현됨

---

### 1️⃣ 초대 링크 생성 (언제, 누가)

#### 요구사항

**생성 시점:**
- 관리자가 참가 신청을 "승인"하는 순간 자동 생성

**생성 주체:**
- Cloud Function (`approveApplication.ts`)
- ❌ 프론트엔드 생성 금지

**생성 데이터:**
```typescript
teamInvites/{inviteId} = {
  teamId,
  tournamentId,
  associationId,
  role: "CAPTAIN",
  tokenHash,          // 실제 토큰은 저장 ❌
  expiresAt,          // now + 24h
  usedAt: null,
  revokedAt: null,
  createdBy: adminId,
  createdAt
}
```

#### 현재 구현 상태

**❌ 미구현:**
- `approveApplication.ts`에서 초대 링크 자동 생성 없음
- 현재는 프론트엔드(`createTeamCaptainInvite.ts`)에서 수동 생성
- 토큰 해시 미사용 (문서 ID를 토큰으로 직접 사용)

**✅ 구현됨:**
- `TeamInvites` 컬렉션 구조 존재
- 24시간 만료 시간 설정
- `used`, `revoked` 플래그 존재

**차이점:**
1. **자동 생성**: 요구사항은 승인 시 자동 생성, 현재는 수동 생성
2. **토큰 해시**: 요구사항은 `tokenHash`로 저장, 현재는 문서 ID를 토큰으로 사용
3. **필드명**: `used` vs `usedAt`, `revoked` vs `revokedAt` (구조 차이)
4. **역할명**: `"captain"` vs `"CAPTAIN"` (대소문자)

---

### 2️⃣ 초대 링크 사용 플로우 (팀장 관점)

#### 요구사항

1. **링크 접속**: 토큰 검증 (존재/만료/사용/폐기)
2. **로그인**: 필수
3. **팀장 확정**: `teams/{teamId}.captainUid = auth.uid`, `teamInvites.usedAt = now`
4. **자동 이동**: `/teams/{teamId}/manage`

#### 현재 구현 상태

**✅ 구현됨:**
- `TeamCaptainInvitePage.tsx`에서 토큰 검증 로직 구현
- 만료/사용/폐기 상태 체크
- 로그인 체크 및 리다이렉트
- UID 바인딩 (`usedByUid`, `captainUid` 설정)
- 팀 관리 화면으로 이동

**⚠️ 개선 필요:**
- 필드명: `used` (boolean) vs `usedAt` (Timestamp)
- 토큰 검증 방식: 문서 ID 직접 사용 vs 해시 비교

---

### 3️⃣ 팀 관리 화면 접근 규칙 (강제)

#### 요구사항

**규칙:**
```typescript
if (user.uid !== team.captainUid) deny
```

**접근 권한:**
- 팀장: ✅
- 일반 팀원: ❌
- 관리자: ❌ (읽기 전용만)
- 비로그인: ❌

#### 현재 구현 상태

**✅ 구현됨:**
- `TeamManagePage.tsx`에서 `user.uid !== team.captainUid` 체크
- 권한 없는 경우 접근 차단 UI 표시
- 관리자 읽기 전용 접근은 별도 페이지 필요

---

### 4️⃣ 만료 UX (가장 중요)

#### 요구사항

**만료 시 화면 문구:**
```
⏰ 초대 링크가 만료되었습니다.

팀장 초대 링크는 보안을 위해
24시간 후 자동 만료됩니다.

아래 버튼을 눌러
새 초대 링크를 요청하세요.

[새 초대 링크 요청]
```

#### 현재 구현 상태

**⚠️ 부분 구현:**
- 만료 상태 UI 존재 (`TeamCaptainInvitePage.tsx` 190-210줄)
- 문구가 요구사항과 다름:
  - 현재: "초대가 만료되었습니다. 운영자에게 새 초대 링크를 요청하세요."
  - 요구: "팀장 초대 링크는 보안을 위해 24시간 후 자동 만료됩니다."

**개선 필요:**
- 문구를 요구사항에 맞게 수정
- "새 초대 링크 요청" 버튼 추가 (관리자 연락 또는 이메일 발송)

---

### 5️⃣ 재발급 로직 (운영 안전장치)

#### 요구사항

**재발급 주체:**
- ✅ 관리자
- ❌ 팀장 (직접 발급 불가)

**재발급 시 규칙:**
1. 기존 invite → `revokedAt` 설정
2. 새 invite 생성
3. 로그 남김:
```typescript
inviteLogs.add({
  type: "REISSUE",
  oldInviteId,
  newInviteId,
  adminId,
  reason
})
```

#### 현재 구현 상태

**✅ 부분 구현:**
- `TeamDetailPage.tsx`에서 재발급 로직 존재 (147-200줄)
- 기존 초대 `revoked: true` 설정
- 새 초대 생성

**❌ 미구현:**
- `inviteLogs` 컬렉션에 로그 기록 없음
- `reason` 필드 없음

---

### 6️⃣ 보안 규칙 (필수)

#### 요구사항

**❌ 절대 금지:**
- 토큰 재사용
- 토큰 평문 저장
- 팀장 변경 UI 제공

**⭕ 필수:**
- token → 해시 비교
- 모든 실패 케이스 로그 기록
- Firestore Rules로 invite 컬렉션 직접 접근 차단

#### 현재 구현 상태

**✅ 구현됨:**
- 토큰 재사용 방지 (`used` 플래그)
- Firestore Rules로 직접 접근 제한 (635-657줄)

**❌ 미구현:**
- 토큰 해시 처리 없음 (문서 ID를 토큰으로 사용)
- 실패 케이스 로그 기록 없음
- Firestore Rules: 읽기가 모두 허용 (`allow read: if true`)

**⚠️ 보안 취약점:**
- 현재는 문서 ID를 토큰으로 사용하므로 DB에서 직접 조회 가능
- 요구사항은 해시를 사용하므로 원본 토큰 노출 방지

---

### 7️⃣ 감사 로그 (운영자 보호용)

#### 요구사항

**반드시 남겨야 할 이벤트:**
- `INVITE_CREATED`
- `INVITE_USED`
- `INVITE_EXPIRED`
- `INVITE_REVOKED`
- `INVITE_REISSUED`

**목적:**
- "누가 언제 뭘 했는지" 바로 확인 가능

#### 현재 구현 상태

**❌ 미구현:**
- 팀장 초대 링크 전용 감사 로그 없음
- `inviteAuditLog.ts`가 있지만 팀장 초대에 적용 안 됨
- 이벤트 타입 정의 없음

**참고:**
- `inviteAuditLog.ts`는 일반 초대용
- 팀장 초대는 별도 로그 구조 필요

---

### 8️⃣ 한 줄 요약 (운영 철학)

**요구사항:**
> 운영자는 승인까지만.  
> 팀 구성은 팀장의 책임.  
> 링크는 짧고, 단단하고, 되돌릴 수 없게.

**현재 구현:**
- 기본 철학은 반영됨
- 보안 강화 필요 (토큰 해시)
- 감사 로그 강화 필요

---

## 🔍 종합 분석

### ✅ 잘 구현된 부분

1. **기본 플로우**: 링크 생성 → 사용 → 권한 부여 플로우 완성
2. **접근 제어**: 팀 관리 화면 접근 규칙 구현
3. **상태 관리**: 사용/만료/폐기 상태 체크
4. **Firestore Rules**: 기본적인 보안 규칙 존재

### ❌ 개선이 필요한 부분

1. **자동 생성**: 승인 시 자동 생성 미구현
2. **토큰 해시**: 보안 강화를 위한 해시 처리 필요
3. **감사 로그**: 이벤트 기록 시스템 없음
4. **재발급 로그**: 재발급 시 로그 기록 없음
5. **만료 UX**: 문구 및 버튼 개선 필요
6. **Firestore Rules**: 읽기 접근 제한 필요

### ⚠️ 보안 취약점

1. **토큰 평문 저장**: 문서 ID를 토큰으로 사용 (DB에서 직접 조회 가능)
2. **로그 부재**: 실패 케이스 로그 없음 (문제 발생 시 추적 불가)
3. **Firestore Rules**: 읽기가 모두 허용 (`allow read: if true`)

---

## 📝 구현 우선순위

### 🔴 높음 (보안 관련)

1. **토큰 해시 처리** (QR 토큰 방식 참고)
2. **Firestore Rules 읽기 제한**
3. **감사 로그 시스템 구축**

### 🟡 중간 (기능 완성)

1. **승인 시 자동 생성**
2. **재발급 로그 기록**
3. **만료 UX 개선**

### 🟢 낮음 (UX 개선)

1. **문구 개선**
2. **에러 메시지 상세화**

---

## 🔗 관련 파일

- `functions/src/tournament/approveApplication.ts` - 승인 함수
- `src/utils/createTeamCaptainInvite.ts` - 초대 생성 유틸
- `src/pages/team/TeamCaptainInvitePage.tsx` - 초대 링크 처리 페이지
- `src/pages/team/TeamManagePage.tsx` - 팀 관리 페이지
- `src/pages/association/admin/TeamDetailPage.tsx` - 재발급 로직
- `firestore.rules` - 보안 규칙
- `functions/src/inviteAuditLog.ts` - 감사 로그 유틸 (참고용)

---

## 💡 참고: QR 토큰 구현 방식

`functions/src/tournament/issueQrToken.ts`와 `qrVerifyAndCheckin.ts`를 참고하면 토큰 해시 처리 방식을 확인할 수 있습니다:

```typescript
// 토큰 해시 생성
const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

// 문서 ID로 해시 사용
db.doc(`.../qrTokens/${tokenHash}`)

// 검증 시 해시로 조회
const tokenHash = crypto.createHash("sha256").update(String(qrToken)).digest("hex");
const tokenDoc = await db.doc(`.../qrTokens/${tokenHash}`).get();
```

이 방식을 팀장 초대 링크에 적용하면 보안이 강화됩니다.
