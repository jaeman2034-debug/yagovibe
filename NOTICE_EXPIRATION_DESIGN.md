# ⏱ 공지 만료(자동 비노출) 설계 문서

## 📋 목표

행사·대회 공지가 기간 지나면 자동으로 내려감

관리자가 직접 내릴 필요 없음

게시/고정/알림과 충돌 없음

"왜 안 보이나요?" → 명확한 상태

## 1️⃣ 핵심 원칙 (중요)

❌ **공지를 삭제하지 않는다**

⭕ **상태(status)로만 제어한다**

### 이유

- 삭제는 히스토리 손실 ❌
- 감사 불가 ❌

## 2️⃣ 상태 모델 최종 확장

```typescript
type NoticeStatus =
  | 'draft'
  | 'pending'
  | 'scheduled'
  | 'published'
  | 'expired'    // ⭐ 만료
  | 'rejected';
```

📌 **expired =**

- 과거 공지
- 검색/관리에서는 보임
- 사용자 화면에서는 숨김

## 3️⃣ Firestore 필드 추가

```typescript
notices/{noticeId} {
  status: 'published' | 'expired'
  publishedAt?: timestamp
  
  expiresAt?: timestamp   // ⭐ 만료 시각
  expiredAt?: timestamp   // 실제 만료 시각 (시스템 자동 설정)
}
```

### 규칙

- `expiresAt` 없으면 → 영구 공지
- `expiresAt` 있고, 시간이 지나면 → 자동 expired

## 4️⃣ 프론트엔드 UX (관리자)

### 🔹 게시 옵션에 "만료 설정" 추가

```typescript
<Checkbox
  checked={hasExpiry}
  onChange={setHasExpiry}
>
  만료 날짜 설정
</Checkbox>

{hasExpiry && (
  <DateTimePicker
    label="공지 만료 시각"
    value={expiresAt}
    min={publishedAt ?? now()}
    onChange={setExpiresAt}
  />
)}
```

### 🔎 관리자 화면 표시

```
[게시중] 노원구 구정장기 축구대회 안내
- 만료 예정: 2026-06-30 23:59
```

## 5️⃣ 사용자 화면 필터링 (중요)

```typescript
query(
  noticesRef,
  where('status', '==', 'published'),
  orderBy('pinned', 'desc'),
  orderBy('publishedAt', 'desc')
);
```

👉 **expired는 절대 사용자 쿼리에 안 나옴**

## 6️⃣ 자동 만료 처리 (Cloud Functions 핵심)

```typescript
export const expireNotices = onSchedule(
  'every 1 minutes',
  async () => {
    const now = Timestamp.now();

    const snap = await db
      .collection('notices')
      .where('status', '==', 'published')
      .where('expiresAt', '<=', now)
      .get();

    for (const doc of snap.docs) {
      await doc.ref.update({
        status: 'expired',
        expiredAt: now,
        pinned: false, // ⭐ 자동 고정 해제
      });
      
      // 히스토리 기록
      await db.collection('notices', doc.id, 'history').add({
        action: 'expire',
        after: {
          title: doc.data().title,
          content: doc.data().content,
          status: 'expired',
        },
        actorUid: 'system',
        actorRole: 'system',
        createdAt: now,
      });
    }
  }
);
```

📌 **포인트:**

- 만료 시 pinned 자동 해제
- 알림 ❌ (보통 만료 알림은 안 보냄)

## 7️⃣ 히스토리 기록 (4번과 연결)

```typescript
action: 'expire'
after: {
  status: 'expired'
}
```

### 히스토리 예시:

```
[2026-07-01 00:00] ⏱ 공지 만료 처리
```

## 8️⃣ Firestore Rules (만료 보호)

```javascript
// Admin은 만료 설정 가능
allow update: if isAdmin(assocId)
  && request.resource.data.expiresAt is timestamp;

// expired 전환은 시스템만
allow update: if false; // ❌ 직접 수정 금지 (Cloud Functions만)
```

👉 만료는 오직 백엔드에서만 발생

## 9️⃣ UX 정책 권장안 (실무)

| 공지 유형 | 만료 |
|-----------|------|
| 대회/행사 | ⭕ 필수 |
| 모집/신청 | ⭕ 필수 |
| 행정 안내 | ❌ 선택 |
| 규정/상시 | ❌ 없음 |

## 🔟 현재 구현 상태

### ✅ 완료된 작업

1. **NoticeStatus 타입 확장**: `expired` 상태 추가
2. **Notice 인터페이스 확장**: `expiresAt`, `expiredAt` 필드 추가
3. **히스토리 Action 확장**: `expire` action 추가
4. **NoticeEditDrawer 상태 추가**: `hasExpiry`, `expiresAt` state 추가
5. **만료 설정 UI 추가**: 게시 옵션에 만료 설정 체크박스 및 DateTimePicker 추가
6. **저장 로직**: `expiresAt` 필드 저장 로직 추가
7. **로드 로직**: `expiresAt` 필드 로드 로직 추가

### ⚠️ 주의사항

- `expired` 상태 전환은 **Cloud Functions에서만** (프론트엔드에서 직접 설정하지 않음)
- 사용자 화면 쿼리에서 `status === 'published'`만 조회 (expired 제외)
- 만료 시 pinned 자동 해제 (Cloud Functions에서 처리)

## 1️⃣1️⃣ 다음 단계 (선택사항)

1. **Cloud Functions 구현**: `expireNotices` 스케줄러 함수
2. **관리자 화면 표시**: 만료 예정 공지 표시
3. **만료 알림**: (일반적으로 불필요, 선택 사항)

## 🧠 한 줄 정리 (아주 중요)

공지는 "게시"보다 "언제 내려가느냐"가 더 중요하다.  
만료가 있어야 운영이 자동화된다.

