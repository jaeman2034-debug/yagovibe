# 🔥 채팅방 생성 규칙 및 권한 관리 (실서비스 안정성)

## 📋 채팅방 ID 형식 규칙

### 모집 단체방 (Team Recruit)
```
roomId = teamRecruit_${postId}
```

**핵심 규칙:**
- ✅ 같은 모집글 → 같은 채팅방 (deterministic)
- ✅ 중복 방 생성 절대 방지
- ✅ 새로 들어와도 기존 방 입장
- ✅ 하위 호환: `recruit_${postId}` 형식도 지원

**예시:**
- 모집글 ID: `abc123`
- 채팅방 ID: `teamRecruit_abc123`

---

### 중고거래 채팅방 (Trade)
```
roomId = trade_${productId}_${sortedUserIds}
```

**핵심 규칙:**
- ✅ 같은 상품 + 같은 구매자/판매자 = 같은 방
- ✅ user ID 정렬하여 중복 방 생성 방지

---

## 🔐 접근 권한 규칙

### 모집 단체방 접근 권한

#### 1단계: 기본 검증
- ✅ 로그인 필수
- ✅ 작성자 본인은 채팅 불가
- ✅ 게시글 데이터 유효성 확인

#### 2단계: 모집 마감 상태 확인
- ✅ 마감된 모집: 신규 참여 차단
- ✅ 마감 + 승인된 사용자: 채팅 가능
- ✅ 마감 + 승인 안 됨: 채팅 불가

#### 3단계: 참여 상태 기반 권한 검증
- ✅ **승인된 사용자만 채팅 가능** (스팸 방지)
- ✅ DB 이중 검증 (marketJoins 문서 확인)
- ✅ 상태 불일치 시 경고 및 차단

**권한 분기:**
```typescript
if (!isApproved) {
  // 채팅 불가
  alert("승인된 사용자만 채팅할 수 있습니다.");
  return;
}
```

---

### 채팅방 접근 검증 (ChatPage)

#### members 배열 확인
```typescript
const members = room.members || room.participants || [];
const isMember = members.includes(userId);

if (!isMember) {
  // 접근 차단
  alert("이 채팅방에 접근할 권한이 없습니다.");
  navigate("/app/market");
  return;
}
```

#### 모집 단체방 추가 검증
- ✅ members 배열에 없으면 marketJoins에서 승인 상태 확인
- ✅ 승인 상태가 아니면 접근 차단

---

## 🚫 모집 마감 상태 처리

### 마감 시 동작
1. **신규 참여 차단**
   - "참여 신청하기" 버튼 비활성화
   - "모집 마감" 배지 표시

2. **기존 참여자 채팅 유지**
   - 승인된 사용자는 채팅 가능
   - "채팅하기" 버튼 활성화

3. **마감 + 승인 안 됨**
   - 채팅 불가
   - "모집 마감" 버튼만 표시

---

## 📊 데이터 모델

### chatRooms 컬렉션 구조

```typescript
chatRooms/{roomId}
{
  // 🔥 핵심 필드
  postId: string              // 모집글 ID
  type: "recruit_group"       // 모집 단체방 구분
  authorId: string            // 작성자 UID
  members: string[]           // 접근 제어용 배열 (실서비스 안정성)
  
  // 🔥 하위 호환 필드
  participants: string[]      // 기존 구조 유지
  roles: {
    [authorId]: "host",       // 작성자 = 호스트
    [userId]: "member"       // 참여자 = 멤버
  }
  
  // 공통 필드
  createdAt: timestamp
  updatedAt: timestamp
  lastMessage: string
  lastMessageAt: timestamp
  unreadCount: {
    [uid: string]: number
  }
  
  // 게시글 스냅샷 (삭제되어도 표시 가능)
  postSnapshot?: {
    postId: string
    title: string
    imageUrl: string
    images: string[]
  }
}
```

---

## 🔧 구현 위치

### 채팅방 생성/확인
- **파일**: `src/lib/chat/room.ts`
- **함수**: `ensureRecruitRoom()`
- **규칙**: `teamRecruit_${postId}` 형식

### 권한 검증
- **파일**: `src/features/market/components/details/RecruitDetail.tsx`
- **함수**: `handleChat()`
- **검증 단계**: 3단계 (기본 검증 → 마감 확인 → 참여 상태)

### 접근 권한 가드
- **파일**: `src/hooks/useChatGuard.ts`
- **함수**: `canEnterChat()`
- **검증**: members 배열 + marketJoins 승인 상태

### ChatPage 접근 검증
- **파일**: `src/pages/chat/ChatPage.tsx`
- **검증**: members 배열 확인 + 모집 마감 상태 확인

---

## ✅ 체크리스트

### 채팅방 생성 규칙
- [x] `teamRecruit_${postId}` 형식 통일
- [x] 중복 방 생성 방지 로직
- [x] 기존 방 재사용 로직
- [x] 멤버 추가 (중복 방지)

### 권한 분기
- [x] 로그인 체크
- [x] 작성자 본인 차단
- [x] 모집 마감 상태 확인
- [x] 승인 상태 기반 채팅 권한
- [x] DB 이중 검증

### 모집 마감 처리
- [x] 마감 시 신규 참여 차단
- [x] 승인된 사용자 채팅 유지
- [x] 마감 + 승인 안 됨 채팅 차단

### 접근 권한 검증
- [x] ChatPage members 배열 확인
- [x] useChatGuard 모집 단체방 처리
- [x] 하위 호환 지원 (`recruit_` 형식)

---

## 🎯 실서비스 안정성 보장

### 중복 방 생성 방지
- ✅ deterministic ID 생성
- ✅ 기존 방 재사용 로직
- ✅ 멤버 추가 시 중복 체크

### 스팸 방지
- ✅ 승인된 사용자만 채팅 가능
- ✅ DB 이중 검증
- ✅ 상태 불일치 시 차단

### 접근 제어
- ✅ members 배열 기반 권한 관리
- ✅ marketJoins 승인 상태 확인
- ✅ 모집 마감 상태 처리

---

## 📝 참고사항

### 하위 호환성
- 기존 `recruit_${postId}` 형식도 지원
- ChatPage에서 두 형식 모두 처리
- 점진적 마이그레이션 가능

### 서버 트리거
- Cloud Function에서 승인 시 채팅방 생성
- 클라이언트는 확인만 수행
- 실패 시 클라이언트에서 생성 시도
