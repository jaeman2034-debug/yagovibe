# 🔥 알림 기반 UX 완성 (승인 / 변경 / 공지)

**생성일**: 2025-01-27  
**목적**: 상태 전이 이벤트를 알림으로 연결하여 사용자가 맥락을 복구할 수 있게 하기  
**상태**: ✅ 완료

---

## ✅ 완료된 개선 사항

### 1. 가입 승인 알림 개선 (P1-W → P2)

**파일**: `src/lib/team/teamJoinRequest.ts`

**변경 전**:
```
${teamName} 팀 가입이 승인되었습니다.
```

**변경 후**:
```
🎉 ${teamName} 팀 가입이 승인되었어요! 이제 팀원으로 활동할 수 있어요.
```

**클릭 시 이동**: `/me` (팀원 상태 확인)

---

### 2. 협회 가입 완료 알림 추가 (P3 → P2 전체)

**파일**: `functions/src/api/approveTeamMembership.ts`

**새로 추가**:
- 팀 전체 멤버에게 알림 발송
- 협회명 포함 메시지
- 팀 페이지로 이동 링크

**알림 내용**:
```
🏆 우리 팀이 {협회명}에 가입했어요! 이제 공식 리그와 대회에 참여할 수 있어요.
```

**클릭 시 이동**: `/teams/${teamId}` (팀 페이지)

---

### 3. 팀장 위임 알림 개선 (P2 → P3)

**파일**: `functions/src/transferOwner.ts`

**변경 전**:
```
${teamName}의 팀장이 되었어요 👑
```

**변경 후**:
```
🛡️ ${teamName}의 팀장으로 위임되었어요. 이제 팀을 관리할 수 있어요.
```

**클릭 시 이동**: `/me/team/${teamId}/manage` (팀 관리 페이지)

---

### 4. 팀에서 제거 알림 개선

**파일**: `functions/src/removeMember.ts`

**변경 전**:
```
${teamName}에서 제외되었어요.
```

**변경 후**:
```
ℹ️ ${teamName}에서 제외되었어요. 다른 팀에 가입하거나 새 팀을 만들 수 있어요.
```

**클릭 시 이동**: `/me` (P1 상태로 자연 복귀)

---

### 5. MePage에서 알림 처리

**파일**: `src/pages/me/MePage.tsx`

**추가된 알림 타입**:
- `ASSOCIATION_JOINED` - 협회 가입 완료

**토스트 메시지**:
- `ASSOCIATION_JOINED`: "🏆 우리 팀이 협회에 가입했어요!"

---

## 🎯 알림 설계 원칙

### 1. 상태 전이 이벤트만 알림

**알림 대상**:
- ✅ P1-W → P2 (가입 승인)
- ✅ 협회 가입 완료 (팀 전체)
- ✅ P2 → P3 (팀장 위임)
- ✅ 팀에서 제거

**알림하지 않는 것**:
- ❌ 일반적인 조회/수정
- ❌ 자동 처리된 작업

---

### 2. 클릭 시 정확한 다음 페이지로 이동

**알림 타입별 링크**:

| 알림 타입 | 링크 | 이유 |
|---------|------|------|
| `TEAM_JOIN_APPROVED` | `/me` | 팀원 상태 확인 |
| `ASSOCIATION_JOINED` | `/teams/${teamId}` | 팀 페이지에서 협회 정보 확인 |
| `TEAM_CAPTAIN_DELEGATED` | `/me/team/${teamId}/manage` | 팀 관리 페이지로 바로 이동 |
| `TEAM_MEMBER_REMOVED` | `/me` | P1 상태로 자연 복귀 |

---

### 3. 읽지 않아도 "무슨 일인지" 이해 가능

**메시지 구조**:
- 이모지로 시각적 구분
- 무엇이 일어났는지 명확히 설명
- 다음에 할 수 있는 것 제시

**예시**:
- `🎉 팀 가입이 승인되었어요! 이제 팀원으로 활동할 수 있어요.`
- `🏆 우리 팀이 협회에 가입했어요! 이제 공식 리그와 대회에 참여할 수 있어요.`
- `🛡️ 팀장으로 위임되었어요. 이제 팀을 관리할 수 있어요.`

---

## 📋 알림 데이터 구조

```typescript
notification = {
  id: string;
  userId: string;           // 수신자
  type: NotificationType;   // 'TEAM_JOIN_APPROVED' | 'ASSOCIATION_JOINED' | ...
  teamId?: string;         // 팀 관련 알림일 때
  associationId?: string;  // 협회 관련 알림일 때
  message: string;         // 사용자용 메시지
  link: string;            // 클릭 시 이동 경로 (핵심!)
  isRead: boolean;
  createdAt: Timestamp;
}
```

---

## 🔔 알림 표시 UX

### 1. 인앱 알림 (MePage)

**표시 방식**:
- 상단 벨 아이콘에 안 읽은 알림 수 Badge
- 알림 리스트에서 최신순 표시
- 읽지 않은 알림은 파란색 배경 강조

**클릭 동작**:
- 읽음 처리 (`markNotificationAsRead`)
- `link` 필드로 이동

---

### 2. 토스트 알림 (실시간)

**MePage에서 자동 표시**:
- 읽지 않은 팀 관련 알림 감지
- 최신 알림 하나만 토스트로 표시
- 중복 방지 (처리된 알림 ID 추적)

**토스트 메시지**:
- `TEAM_JOIN_APPROVED`: "팀 가입이 승인되었어요 🎉"
- `ASSOCIATION_JOINED`: "🏆 우리 팀이 협회에 가입했어요!"
- `TEAM_CAPTAIN_DELEGATED`: "팀장이 되었어요 👑"
- `TEAM_MEMBER_REMOVED`: "팀에서 제외되었어요."

---

## ✅ 결과

### 해결된 문제
1. ✅ 상태 전이 이벤트를 알림으로 연결
2. ✅ 클릭 시 정확한 다음 페이지로 이동
3. ✅ 읽지 않아도 "무슨 일인지" 이해 가능
4. ✅ 팀 전체 멤버에게 협회 가입 완료 알림 발송

### 개선된 UX
- **맥락 연결**: 알림이 다음 행동으로 자연스럽게 이어짐
- **명확한 메시지**: 이모지와 설명으로 즉시 이해
- **정확한 링크**: 알림 타입별로 최적의 페이지로 이동
- **실시간 피드백**: 토스트로 즉시 알림

---

## 🎯 UX 원칙

> 알림은 '알려주는 기능'이 아니라  
> 사용자를 다음 행동으로 데려가는 UX 레일이다.

---

## 🔍 관련 파일

- `functions/src/api/approveTeamMembership.ts` - 협회 가입 완료 알림
- `src/lib/team/teamJoinRequest.ts` - 가입 승인 알림
- `functions/src/transferOwner.ts` - 팀장 위임 알림
- `functions/src/removeMember.ts` - 팀원 제거 알림
- `src/pages/me/MePage.tsx` - 알림 실시간 구독 및 토스트
- `src/components/notification/NotificationItem.tsx` - 알림 아이템 컴포넌트
- `src/types/notification.ts` - 알림 타입 정의

---

**작성일**: 2025-01-27  
**상태**: ✅ 완료  
**결과**: 알림 기반 UX가 완성되어 사용자가 맥락을 복구할 필요 없이 다음 행동으로 자연스럽게 이동
