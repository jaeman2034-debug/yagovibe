# 🔔 공지 자동 알림 시스템 설계 문서

## 📋 목표

게시 / 수정 / 중요 변경 시 사용자에게 자동 알림

관리자 권한·승인 구조와 완벽 정합

스팸 ❌ / 중요한 것만 알림 ⭕

## 1️⃣ 알림 트리거 이벤트 (정책)

| 이벤트 | 알림 대상 | 알림 여부 |
|--------|-----------|-----------|
| 최초 게시 (published) | 전체 사용자 | ✅ |
| 예약 게시 시간 도래 | 전체 사용자 | ✅ |
| pinned 설정 | 전체 사용자 | ✅ |
| pinned 해제 | ❌ | (굳이 X) |
| 공지 내용 수정 | ❌ 기본 / ⭕ 중요 변경만 | (선택) |
| 반려 | 작성자(Admin) | ✅ |
| 승인 | 작성자(Admin) | ✅ |

👉 **"게시됨"만 자동 알림 = 가장 안전**

## 2️⃣ 알림 데이터 모델 (Firestore)

```typescript
notifications/{notificationId} {
  type: 'NOTICE_PUBLISHED' | 'NOTICE_SCHEDULED_PUBLISHED' | 'NOTICE_PINNED' | 'NOTICE_APPROVED' | 'NOTICE_REJECTED'
  noticeId: string
  title: string        // 공지 제목
  message: string      // 사용자용 메시지
  
  target: 'all' | 'admins' | 'user'
  targetUid?: uid      // 개별 알림일 경우
  
  createdAt: timestamp
  readBy?: uid[]       // 읽은 사용자 (옵션)
}
```

## 3️⃣ 알림 생성 위치 (중요)

❌ **프론트에서 알림 생성하지 마라**

⭕ **Cloud Functions에서만 생성**

### 이유

- 중복 방지
- 권한 신뢰
- 예약 게시 자동 알림 가능

## 4️⃣ Cloud Functions – 게시 시 알림 (핵심)

### 즉시 게시 / 예약 게시 공통

```typescript
export const onNoticePublished = onDocumentUpdated(
  'notices/{noticeId}',
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (
      before.status !== 'published' &&
      after.status === 'published'
    ) {
      await db.collection('notifications').add({
        type: 'NOTICE_PUBLISHED',
        noticeId: event.params.noticeId,
        title: after.title,
        message: `새 공지가 등록되었습니다.`,
        target: 'all',
        createdAt: Timestamp.now(),
      });
    }
  }
);
```

👉 예약 게시도 status 전환 시점에 자동 처리

### pinned 알림 (선택 but 강력)

```typescript
if (!before.pinned && after.pinned) {
  await db.collection('notifications').add({
    type: 'NOTICE_PINNED',
    noticeId,
    title: after.title,
    message: `중요 공지가 상단에 고정되었습니다.`,
    target: 'all',
    createdAt: Timestamp.now(),
  });
}
```

### 관리자 승인/반려 알림

**✅ 승인**
```typescript
type: 'NOTICE_APPROVED'
target: 'user'
targetUid: after.createdBy
message: '공지 게시가 승인되었습니다.'
```

**❌ 반려**
```typescript
type: 'NOTICE_REJECTED'
target: 'user'
targetUid: after.createdBy
message: `공지 게시가 반려되었습니다: ${rejectReason}`
```

## 5️⃣ 사용자 UI – 알림 표시

### 🔔 헤더 알림 벨

- 읽지 않은 알림 개수 표시
- 클릭 시 알림 리스트 Drawer

### 📋 알림 리스트 예시

```
📢 새 공지가 등록되었습니다
- 노원구 구정장기 축구대회 안내
- 2026.02.05

📌 중요 공지가 상단에 고정되었습니다
```

## 6️⃣ 알림 중복/스팸 방지 룰 (중요)

❌ **이런 건 보내지 말자**

- 단순 오타 수정
- draft → draft 저장
- 승인 대기 상태 변경

⭕ **보내자**

- status가 published로 바뀌는 순간
- pinned true 되는 순간

## 7️⃣ 확장 설계 (나중에 바로 가능)

| 채널 | 방법 |
|------|------|
| 웹 푸시 | Firebase Cloud Messaging |
| 모바일 | FCM |
| 이메일 | SendGrid / SES |
| SMS | 중요 공지 한정 |

👉 notification 컬렉션 그대로 재사용

## 8️⃣ 현재 구현 상태

### ✅ 완료된 작업

1. **알림 타입 정의**: `NoticeNotification` 인터페이스
2. **알림 조회 Hook**: `useNoticeNotifications` 생성
3. **알림 UI 컴포넌트**: (추후 구현)

### ⚠️ 주의사항

- 알림 생성은 **Cloud Functions에서만** (프론트엔드에서 생성하지 않음)
- `useNoticeNotifications` Hook은 읽기 전용 (조회만)
- 실시간 구독은 추후 확장 가능

## 9️⃣ 다음 단계 (선택사항)

1. **알림 UI 컴포넌트**: NotificationBell, NotificationList
2. **Cloud Functions 구현**: `onNoticePublished`, `onNoticePinned` 등
3. **알림 읽음 처리**: `readBy` 배열 업데이트
4. **실시간 구독**: `onSnapshot` 사용
5. **푸시 알림**: FCM 연동

## 🧠 한 줄 정리 (아주 중요)

알림은 "글이 바뀔 때"가 아니라  
"사용자가 알아야 할 때"만 보내야 한다.  
published / pinned 두 가지만 지켜라.

