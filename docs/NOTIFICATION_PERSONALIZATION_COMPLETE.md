# 🔥 알림 설정 개인화 완성

**생성일**: 2025-01-27  
**목적**: 사용자가 신경 쓰는 알림만 정확히 받을 수 있게 하기  
**상태**: ✅ 완료

---

## ✅ 완료된 개선 사항

### 1. 알림 설정 유틸리티 함수 생성 (서버)

**파일**: `functions/src/utils/notificationSettings.ts`

**기능**:
- 사용자별 알림 설정 조회
- 알림 타입별 설정 확인
- 기본값 처리 (안전한 기본값)

**함수**:
- `getUserNotificationSettings(uid)`: 사용자 설정 조회
- `shouldSendNotification(uid, notificationType)`: 알림 발송 여부 확인

---

### 2. 알림 생성 함수들에 설정 확인 로직 추가

**수정된 파일**:
- `functions/src/notifications/onTeamJoinApproved.ts` - 가입 승인 알림
- `functions/src/api/approveTeamMembership.ts` - 협회 가입 완료 알림

**변경 내용**:
- 알림 생성 전 `shouldSendNotification` 호출
- 설정이 OFF면 알림 스킵 (활동 로그는 생성)

---

### 3. 프론트엔드 알림 설정 UI 생성

**파일**: `src/components/me/NotificationSettings.tsx`

**기능**:
- 개인별 알림 설정 관리
- 토글 즉시 저장 (저장 버튼 없음)
- 필수 알림은 끌 수 없음 표시

**UI 구조**:
- 중요 알림 (기본 ON, 끄기 가능)
- 선택 알림 (기본 OFF)
- 필수 알림 (끌 수 없음, 🔒 아이콘)

---

### 4. SettingsPage에 알림 설정 추가

**파일**: `src/pages/SettingsPage.tsx`

**변경 내용**:
- `NotificationSettings` 컴포넌트 추가
- 알림 설정 섹션 추가

---

## 📦 데이터 모델

**저장 위치**: `/users/{uid}/notificationSettings/default`

```typescript
notificationSettings = {
  // 중요 알림 (기본 ON, 끄기 가능)
  joinApproved: true,        // 가입 승인 (TEAM_JOIN_APPROVED)
  associationJoined: true,   // 협회 가입 완료 (ASSOCIATION_JOINED)
  roleChanged: true,         // 역할 변경 (추후 확장)
  
  // 선택 알림 (기본 OFF)
  teamNotice: false,         // 팀 공지 (추후 확장)
  marketing: false,          // 마케팅 알림 (추후 확장)
  
  updatedAt: Timestamp
};
```

---

## 🎯 알림 유형 분류

### 필수 알림 (기본 ON, 끌 수 없음)

- `TEAM_CAPTAIN_DELEGATED` - 팀장 위임
- `TEAM_MEMBER_REMOVED` - 팀에서 제거됨

**처리**: `shouldSendNotification`에서 항상 `true` 반환

---

### 중요 알림 (기본 ON, 끄기 가능)

- `TEAM_JOIN_APPROVED` - 가입 승인
- `ASSOCIATION_JOINED` - 협회 가입 완료
- 역할 변경 (추후 확장)

**처리**: 설정 확인 후 발송 여부 결정

---

### 선택 알림 (기본 OFF)

- 팀 공지 (추후 확장)
- 마케팅 알림 (추후 확장)

**처리**: 설정이 ON일 때만 발송

---

## 🔁 서버 처리 로직

**알림 생성 시**:

```ts
// 알림 설정 확인
const { shouldSendNotification } = await import("../utils/notificationSettings");
const canSend = await shouldSendNotification(userId, "TEAM_JOIN_APPROVED");

if (!canSend) {
  logger.info("사용자 알림 설정 OFF, 알림 스킵");
  // 알림은 스킵하지만 활동 로그는 생성
} else {
  // 알림 생성
  await notificationRef.set({...});
}
```

**핵심 원칙**:
- ❗ 생성은 서버에서, 판단도 서버에서
- 프론트 조건 분기 ❌

---

## 🧩 UI 위치

**경로**: `/app/settings` 또는 `/me` → 설정

**구조**:
```
알림 설정
- 중요 알림
  - 팀 가입 승인 알림   [ON]
  - 협회 가입 알림       [ON]
  - 역할 변경 알림       [ON]
- 선택 알림
  - 팀 공지 알림         [OFF]
  - 마케팅 알림          [OFF]
- 필수 알림
  - 팀장 위임 알림       🔒 (끌 수 없음)
  - 팀에서 제외 알림     🔒 (끌 수 없음)
```

---

## 🧠 UX 디테일

### 토글 변경 시
- 즉시 저장 (저장 버튼 없음)
- 토스트: "설정이 저장되었어요"

### 끌 수 없는 알림
- 🔒 아이콘 + 설명
- 회색 배경으로 비활성화 표시

### 최초 진입 시
- "💡 중요 알림은 항상 보내드려요. (팀장 위임, 팀에서 제외 등)" 안내

---

## ✅ 결과

### 해결된 문제
1. ✅ 개인별 알림 설정 관리
2. ✅ 알림 타입별 토글
3. ✅ 필수 알림은 끌 수 없음
4. ✅ 토글 즉시 저장

### 개선된 UX
- **개인화**: 사용자가 신경 쓰는 알림만 받음
- **명확한 분류**: 중요/선택/필수 알림 구분
- **즉각적인 피드백**: 토글 변경 시 즉시 저장
- **안전한 기본값**: 중요 알림은 기본 ON

---

## 🎯 UX 원칙

> 알림 개인화는 '끄는 기능'이 아니라  
> 사용자의 신뢰를 얻는 장치다.

---

## 🔍 관련 파일

- `functions/src/utils/notificationSettings.ts` - 알림 설정 유틸리티
- `functions/src/notifications/onTeamJoinApproved.ts` - 가입 승인 알림 (설정 확인 추가)
- `functions/src/api/approveTeamMembership.ts` - 협회 가입 완료 알림 (설정 확인 추가)
- `src/components/me/NotificationSettings.tsx` - 알림 설정 UI
- `src/pages/SettingsPage.tsx` - 설정 페이지 (알림 설정 추가)

---

## 🎉 시스템 완성

이제 다음이 모두 완성되었습니다:

- ✅ 기본 UX 레일
- ✅ 팀 라이프사이클
- ✅ 고급 옵션 (알림 설정 개인화)

👉 **완성된 팀 조직 시스템**

---

**작성일**: 2025-01-27  
**상태**: ✅ 완료  
**결과**: 사용자가 신경 쓰는 알림만 정확히 받을 수 있게 되어 사용자 신뢰 향상
