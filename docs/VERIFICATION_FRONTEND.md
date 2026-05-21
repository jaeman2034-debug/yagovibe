# 🔥 인증 최전면 기능 설계

**목표**: 대면/실명 뱃지 카드 상단, 미인증 → 채팅 3회 제한  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 인증 상태 판정

### 1. 인증된 사용자

**조건**:
- ✅ `trustTier === "verified" || trustTier === "host"`
- ✅ `faceToFaceVerified === true` (대면 인증)
- ✅ `realNameVerified === true` (실명 인증)

**권한**:
- ✅ 채팅 제한 없음
- ✅ 모든 기능 사용 가능

---

### 2. 미인증 사용자

**조건**:
- ❌ `trustTier === "guest" || trustTier === "basic"`
- ❌ `faceToFaceVerified === false`
- ❌ `realNameVerified === false`

**제한**:
- ⚠️ 채팅 3회 제한 (하루)
- ⚠️ 일부 기능 제한

---

## 🔍 쿼리 조건

### 1. 사용자 인증 상태 확인

```typescript
// Firestore Console → Query
Collection: users
Document: {uid}
Fields:
  - trustTier (string)
  - faceToFaceVerified (boolean)
  - realNameVerified (boolean)
```

---

### 2. 오늘 보낸 채팅 수 계산

```typescript
// 모든 채팅방에서 오늘 보낸 메시지 수 집계
const chatRoomsSnap = await getDocs(
  query(
    collection(db, "chatRooms"),
    where("participants", "array-contains", uid)
  )
);

for (const chatRoomDoc of chatRoomsSnap.docs) {
  const messagesSnap = await getDocs(
    query(
      collection(db, "chatRooms", chatRoomDoc.id, "messages"),
      where("senderId", "==", uid),
      where("createdAt", ">=", todayStart)
    )
  );
}
```

---

## ⚠️ 운영 규칙

### 1. 채팅 제한 규칙

**미인증 사용자**:
- ✅ 하루 최대 3회 채팅 가능
- ✅ 인증 후 제한 해제

**인증된 사용자**:
- ✅ 채팅 제한 없음

---

### 2. 인증 뱃지 표시 규칙

**게시물 카드**:
- ✅ 대면 인증: `faceToFaceVerified === true`
- ✅ 실명 인증: `realNameVerified === true || trustTier >= "verified"`

**표시 위치**:
- ✅ 게시물 카드 상단
- ✅ 게시물 상세 화면

---

## 💬 사용자 문구

### 1. 채팅 제한 안내

```
인증이 필요한 기능입니다.
대면 인증 또는 실명 인증을 완료해주세요.
남은 채팅: 2회
```

---

### 2. 인증 뱃지

```
대면 인증 • 실명 인증
```

---

## 📈 모니터링 지표

### 1. 인증 비율

```typescript
// 목표: ≥58%
const verifiedRate = (verifiedUsers.length / totalUsers.length) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: < 58%

---

### 2. 미인증 사용자 채팅 제한률

```typescript
// 미인증 사용자 중 채팅 제한에 걸린 비율
const limitRate = (limitedUsers.length / unverifiedUsers.length) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**목표**: ≤ 20%

---

**인증 최전면 기능 설계 완성**
