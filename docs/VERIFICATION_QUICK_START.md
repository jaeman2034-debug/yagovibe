# ⚡ 인증 최전면 기능 빠른 시작 가이드

**목표**: 대면/실명 뱃지 카드 상단, 미인증 → 채팅 3회 제한  
**배포 시간**: 5분

---

## 🚀 배포 체크리스트

### 1. 클라이언트 배포

```bash
# 루트 디렉토리에서
npm run build
npm run deploy
```

**확인할 컴포넌트**:
- ✅ `VerificationBadge` - 인증 뱃지 컴포넌트
- ✅ `useChatLimit` - 채팅 제한 훅
- ✅ `EquipmentCard` - 인증 뱃지 통합

---

## 📊 운영 설정값

### 기본 설정 (변경 불필요)

```typescript
MAX_CHATS_FOR_UNVERIFIED = 3; // 미인증 사용자 최대 채팅 횟수
```

### 조정 가능한 설정

```typescript
// src/hooks/useChatLimit.ts 수정
const MAX_CHATS_FOR_UNVERIFIED = 3; // 3회 → 5회로 변경 가능
```

---

## 🔍 모니터링 쿼리 (즉시 실행 가능)

### 1. 인증 비율

```typescript
// Firestore Console → Query
Collection: users
Where:
  - trustTier == "verified" OR trustTier == "host"
  OR faceToFaceVerified == true
  OR realNameVerified == true

// 인증 비율 = (인증 사용자 수 / 전체 사용자 수) × 100
```

---

### 2. 미인증 사용자 채팅 제한률

```typescript
// Cloud Functions → Logs에서 확인
// 또는 Firestore Console에서 수동 계산

// 미인증 사용자 중 오늘 3회 이상 채팅한 사용자
Collection: users
Where:
  - trustTier == "guest" OR trustTier == "basic"
  - faceToFaceVerified == false
  - realNameVerified == false
```

---

## ⚠️ 예외 처리 확인

### 1. 인증 상태 확인

**확인 방법**:
```typescript
// Firestore Console → Query
Collection: users
Document: {uid}
Fields:
  - trustTier
  - faceToFaceVerified
  - realNameVerified
```

**예상 결과**: 인증 상태 필드 확인

---

### 2. 채팅 제한 확인

**확인 방법**:
```typescript
// 모든 채팅방에서 오늘 보낸 메시지 수 집계
Collection: chatRooms
Where:
  - participants array-contains {uid}
Subcollection: messages
Where:
  - senderId == {uid}
  - createdAt >= (오늘 00:00)
```

**예상 결과**: 오늘 보낸 채팅 수 확인

---

## 💬 사용자 문구 (복사-붙여넣기)

### 채팅 제한 안내

```tsx
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <p className="text-sm font-medium text-yellow-800">
    ⚠️ 인증이 필요한 기능입니다
  </p>
  <p className="text-xs text-yellow-600 mt-1">
    대면 인증 또는 실명 인증을 완료해주세요.
  </p>
  <p className="text-xs text-yellow-600 mt-1">
    남은 채팅: {remainingChats}회
  </p>
</div>
```

---

### 인증 뱃지

```tsx
import VerificationBadge from "@/components/market/VerificationBadge";

<VerificationBadge
  faceToFaceVerified={post.authorFaceToFaceVerified}
  realNameVerified={post.authorRealNameVerified}
  trustTier={post.authorTrustTier}
/>
```

---

## 📈 KPI 측정 (매일 00:00)

### 1. 인증 비율

**목표**: ≥58%  
**측정 방법**: Firestore 쿼리

---

### 2. 미인증 사용자 채팅 제한률

**목표**: ≤20%  
**측정 방법**: Cloud Functions 로그 또는 Firestore 쿼리

---

## ✅ 배포 후 확인 사항

- [ ] `VerificationBadge` 컴포넌트 배포 완료
- [ ] `useChatLimit` 훅 배포 완료
- [ ] `EquipmentCard`에 인증 뱃지 표시 확인
- [ ] 채팅 제한 로직 동작 확인
- [ ] 인증 비율 측정 시작

---

**인증 최전면 기능 빠른 시작 가이드 완성**
