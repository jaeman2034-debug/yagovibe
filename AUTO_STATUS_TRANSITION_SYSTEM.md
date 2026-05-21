# 🔒 장기 미납 자동 상태 전환 & 권한 제어 시스템

## 📋 개요

"운영진이 불편한 결정을 안 하게 만드는 것"

이 시스템은 회원의 장기 미납 기간에 따라 자동으로 상태를 전환하고 권한을 제어합니다. 모든 결정은 시스템이 자동으로 내리며, 운영진은 "규정상 이렇게 되어 있습니다"라고 말할 수 있습니다.

## 🎯 핵심 철학

- ❌ "그 사람 좀 봐주자"
- ❌ "말 꺼내기 애매해서"
- ❌ "괜히 관계 틀어질까 봐"

이런 인간적 부담은 전부 시스템이 가져갑니다.

## 📊 장기 미납 단계 정의 (정책 고정)

| 미납 기간 | 시스템 상태 | 의미 |
|----------|------------|------|
| 2개월 | `WARNED` | 공식 경고 (알림 발송) |
| 3개월 | `RESTRICTED` | 권한 제한 |
| 4개월 | `PAUSED_AUTO` | 자동 휴원 |
| 6개월 | `REMOVAL_CANDIDATE` | 제명 후보 |

### 핵심 원칙

- ✅ **월 단위 기준**: 정확히 월 단위로 계산
- ✅ **소급 없음**: 과거 데이터는 소급 적용하지 않음
- ✅ **예외는 수동 override만 가능**: 시스템 판단을 우회하려면 OWNER가 직접 Override 필요

## 🔄 상태 전환 트리거

### 트리거 소스

```
monthlyReports/{YYYY-MM}
```

**월간 리포트 생성 = "이달의 공식 판결문"**

월간 리포트가 생성되면 자동으로 모든 회원의 미납 기간을 확인하고 상태를 전환합니다.

## ⚙️ 상태 전환 로직 (불변·기계적)

```typescript
const unpaidMonths = member.unpaidMonths;

if (unpaidMonths >= 6) {
  transition(member, 'REMOVAL_CANDIDATE');
}
else if (unpaidMonths >= 4) {
  transition(member, 'PAUSED_AUTO');
}
else if (unpaidMonths >= 3) {
  transition(member, 'RESTRICTED');
}
else if (unpaidMonths >= 2) {
  transition(member, 'WARNED');
}
```

## 🔒 상태별 자동 권한 제어

### RESTRICTED (3개월)

```typescript
permissions: {
  voting: false,      // ❌ 투표 불가
  eventJoin: false,   // ❌ 이벤트 참여 불가
  writePost: false,   // ❌ 게시글 작성 불가
  viewOnly: true,     // ✔️ 조회만 가능
}
```

**의미**: 영향력 행사 불가, 조회만 가능

### PAUSED_AUTO (4개월)

```typescript
status: 'paused',
pausedReason: 'UNPAID_AUTO',
pausedAt: serverTimestamp(),
```

**의미**:
- 회비 대상 제외
- 통계상 휴원으로 집계
- 자동 복귀 ❌ (납부 후 수동 복귀 필요)

### REMOVAL_CANDIDATE (6개월)

```typescript
flags: ['REMOVAL_REVIEW_REQUIRED']
```

**의미**:
- 자동 제명 ❌ (운영진 검토 필요)
- 운영진에게만 표시
- 회의 안건 자동 생성 가능

**법적/단체 리스크 차단 포인트**

## 📝 전환 기록 (절대 삭제 금지)

### 컬렉션 구조

```
teams/{teamId}/memberTransitions/{transitionId}
```

### 문서 구조

```typescript
{
  memberId: string,
  memberName: string,
  fromStatus: MemberUnpaidStatus,
  toStatus: MemberUnpaidStatus,
  reason: string,              // 'UNPAID_OVER_4_MONTHS' 등
  basedOnReport: string,       // '2025-05'
  unpaidMonths: number,
  isOverride: boolean,
  overrideReason?: string,
  executedAt: Timestamp,
  executedBy: 'SYSTEM' | 'OWNER',
}
```

**이 로그 하나로 모든 분쟁 끝**

## 🛠️ OWNER 전용 Override

### 함수: `overrideMemberStatus`

시스템 판단을 우회하여 수동으로 상태를 변경할 수 있습니다.

**요구사항**:
- OWNER 권한 필수
- Override 사유 입력 필수
- 모든 Override는 별도 로그에 기록

### 사용 예시

```typescript
await overrideMemberStatus(
  teamId,
  memberId,
  'NORMAL',  // 목표 상태
  '특별한 사정으로 인한 일시 면제',  // 사유 (필수)
  ownerId
);
```

### Override 해제

```typescript
await removeStatusOverride(teamId, memberId, ownerId);
```

Override를 해제하면 자동 전환 로직으로 복귀합니다.

## 📁 파일 구조

### 핵심 파일

1. **`functions/src/memberStatusTransition.ts`**
   - 상태 전환 로직
   - 권한 제어
   - Override 함수

2. **`functions/src/autoMonthlyReport.ts`**
   - 월간 리포트 생성
   - 상태 전환 트리거 통합

3. **`firestore.rules`**
   - 보안 규칙 (memberTransitions, statusOverrides 등)

## 🔐 Firestore 보안 규칙

### memberTransitions

- 읽기: OWNER 또는 관리자만 가능
- 쓰기: Functions에서만 가능 (절대 삭제 금지)

### statusOverrides

- 읽기: OWNER 또는 관리자만 가능
- 쓰기: Functions에서만 가능 (Override 함수를 통해서만)

### statusTransitionLogs

- 읽기: OWNER 또는 관리자만 가능
- 쓰기: Functions에서만 가능

## 🚀 배포 및 실행

### 자동 실행

월간 리포트 생성 함수(`autoMonthlyReport`)가 매월 1일 00:05 (KST)에 자동 실행되며, 리포트 생성 후 자동으로 상태 전환을 수행합니다.

### 수동 Override

클라이언트에서 다음 함수를 호출:

```typescript
// 상태 Override
const overrideStatus = httpsCallable(functions, 'overrideMemberStatusCallable');
await overrideStatus({
  teamId: '...',
  memberId: '...',
  targetStatus: 'NORMAL',
  reason: '특별한 사정'
});

// Override 해제
const removeOverride = httpsCallable(functions, 'removeStatusOverrideCallable');
await removeOverride({
  teamId: '...',
  memberId: '...'
});
```

## 📊 UI 반영 (사용자 체감)

### 회원 목록 표시

상태 뱃지 자동 표시:

- 🟡 **경고** (WARNED)
- 🔴 **제한** (RESTRICTED)
- ⏸️ **자동휴원** (PAUSED_AUTO)
- ⚠️ **제명검토** (REMOVAL_CANDIDATE)

제한 아이콘 노출로 시각적으로 상태를 명확히 표시

## ✅ 완성도 체크리스트

- [x] 상태 전환 타입 및 상수 정의
- [x] 월간 리포트 생성 시 자동 상태 전환 트리거
- [x] 상태 전환 로직 구현 (미납 기간별 자동 전환)
- [x] 상태별 권한 제어 로직 구현
- [x] 전환 기록 저장 시스템 구현
- [x] OWNER 전용 Override 함수 구현
- [x] Firestore 보안 규칙 업데이트

## 🎯 다음 단계

이제 시스템 레벨에서 완전 자동화가 완성되었습니다:

- ✅ 자동 판정 → 자동 전환 → 자동 권한 제어 → 기록 고정

운영진 개입 포인트는 단 하나: **override (책임 포함)**

다음 자동 단계로 자연스럽게 이어질 수 있습니다:

- 📈 이상 징후 감지 (미납 급증, 이탈)
- 🧾 회의용 자동 슬라이드 생성
- 🧠 "이번 달 운영 한 줄 요약" 자동 생성

---

**멈출 단어는 여전히 하나: 정지**

아니면 다음으로 간다.

