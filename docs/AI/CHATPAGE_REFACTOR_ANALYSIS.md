# ChatPage.tsx 리팩토링 분석

**생성일**: 2025-01-27  
**분석 대상**: `src/pages/chat/ChatPage.tsx`  
**분석 목적**: 안전한 리팩토링 계획 수립

---

## 1. File Path

```
src/pages/chat/ChatPage.tsx
```

---

## 2. Total Line Count

**2,710줄** (프로젝트 내 가장 큰 단일 파일)

---

## 3. Main Responsibilities Handled Inside ChatPage.tsx

### 3.1 실시간 데이터 관리
- **채팅방 정보 구독**: `onSnapshot(roomRef)` - 채팅방 메타데이터 실시간 동기화
- **메시지 목록 구독**: `onSnapshot(messagesQuery)` - 최근 30개 메시지 실시간 동기화
- **읽음 처리**: `markRoomRead()`, `readBy` 배열 업데이트
- **unreadCount 관리**: 입장 시 초기화, 실시간 업데이트

### 3.2 메시지 전송 및 관리
- **텍스트 메시지**: `sendMessage()`, `sendQuickMessage()` - Optimistic Update 포함
- **음성 메시지**: `handleVoiceMessageSend()` - STT 결과 즉시 전송
- **이미지 메시지**: `sendImageMessage()` 통합
- **동영상 메시지**: `sendVideoMessage()` 통합
- **위치 공유**: `shareLocation()` - Google Maps 링크 생성
- **시스템 메시지**: 거래 완료, 예약 등 자동 생성

### 3.3 UI 상태 관리
- **15개 useState**: room, product, messages, text, suggestions, isSummarizing, showSTTGuide, autoTTS, isLoadingSuggestions, isReserving, isUploadingImages, isUploadingVideos, productMissing, productStatus, suggestions
- **7개 useRef**: listRef, lastMessageIdRef, longPressTimerRef, shareLocationRef, textRef, unreadInitializedRef, hasMarkedReadOnMountRef, lastCheckedKeyRef
- **복잡한 useMemo**: roomType, isDeletedRoom, otherUid, isBuyer

### 3.4 권한 및 접근 제어
- **참여자 확인**: members/participants 배열 검증
- **채팅방 타입 분기**: trade, recruit_group, team
- **마감 상태 체크**: 모집 단체방 마감 시 입력 제한
- **삭제된 채팅방 처리**: status, productSnapshot, recruitStatus 다중 체크

### 3.5 미디어 처리
- **이미지 업로드**: 다중 파일 선택, 썸네일 생성
- **동영상 업로드**: 썸네일, duration 추출
- **미디어 뷰어**: `useMediaViewer()` 훅 통합

### 3.6 음성 기능 (STT/TTS)
- **STT (음성 인식)**: `useSTT()` 훅, iOS/PWA 체크, 마이크 권한 확인
- **TTS (음성 합성)**: `useTTS()` 훅, 요약 재생, 추천 문장 읽기
- **자동 읽기 모드**: `autoTTS` 상태, 새 메시지 자동 읽기

### 3.7 추천 문장 시스템
- **AI 추천**: `getChatSuggestions()` - 구매자/판매자 분기
- **롱프레스 처리**: TTS 읽고 전송
- **탭 처리**: 입력창에 삽입만

### 3.8 거래 관리 (중고거래 전용)
- **예약 처리**: `handleReserve()` - 상품 상태 변경, productSnapshot 업데이트
- **예약 취소**: `handleCancelReserve()` - 상태 복원
- **상품 상태 동기화**: productSnapshot 기반 UI 업데이트

### 3.9 iOS/모바일 최적화
- **키보드 대응**: `--vh` CSS 변수, `visualViewport` API
- **스크롤 보정**: 키보드 올라왔을 때 자동 스크롤
- **PWA 체크**: iOS Safari에서 STT 사용 불가 안내

### 3.10 메시지 렌더링
- **타입별 렌더링**: text, image, video, location, system, notice, event, summary, report, attendance
- **말풍선 스타일**: 당근마켓 스타일, 내 메시지/상대 메시지 구분
- **읽음 표시**: readBy 배열 기반 카톡 스타일
- **전송 중 표시**: pending 상태, optimistic update

---

## 4. UI Sections That Can Be Extracted Into Components

### 4.1 헤더 영역 (이미 분리됨, 하지만 통합 필요)
- ✅ `ChatHeader` - 중고거래 헤더
- ✅ `RecruitGroupChatHeader` - 모집 단체방 헤더
- ✅ `TeamChatHeader` - 팀 채팅 헤더
- ✅ `PinnedNoticeHeader` - 고정 공지
- ✅ `HostPanel` - 호스트 관리 패널
- ❌ **추출 가능**: TTS 요약 버튼 (1616-1675줄) → `TTSSummaryButton`

### 4.2 메시지 리스트 영역
- ✅ `RecruitGroupMessageItem` - 모집 단체방 메시지
- ✅ `NoticeMessageCard`, `EventMessageCard`, `SummaryMessageCard`, `ReportMessageCard`, `AttendanceMessageCard` - 특수 메시지 카드
- ❌ **추출 가능**: 
  - **메시지 리스트 컨테이너** (1678-2235줄) → `MessageListContainer`
  - **중고거래 메시지 아이템** (1800-2204줄) → `TradeMessageItem`
  - **위치 메시지** (1837-1902줄) → `LocationMessage`
  - **이미지 메시지** (2059-2153줄) → `ImageMessage`
  - **동영상 메시지** (1905-2056줄) → `VideoMessage`
  - **텍스트 메시지** (2155-2202줄) → `TextMessage`
  - **시스템 메시지** (1806-1834줄) → `SystemMessage`
  - **빈 상태** (1697-1709줄) → `EmptyMessageList`
  - **새 메시지 알림 버튼** (2209-2234줄) → `NewMessageButton`

### 4.3 추천 문장 영역
- ❌ **추출 가능**: 추천 문장 섹션 전체 (2238-2380줄) → `SuggestionBar`
  - 추천 문장 버튼들
  - STT 버튼
  - 로딩 상태

### 4.4 입력 영역
- ❌ **추출 가능**: 입력창 섹션 전체 (2494-2683줄) → `ChatInputBar`
  - 사진 버튼
  - 위치 공유 버튼
  - 텍스트 입력창
  - 전송 버튼
  - 마감 상태 안내

### 4.5 모달/오버레이
- ✅ `MediaViewer` - 미디어 뷰어
- ❌ **추출 가능**: 
  - **STT 안내 바텀시트** (2400-2491줄) → `STTGuideModal`
  - **iOS 전용 안내 배너** (2686-2701줄) → `IOSSTTBanner`
  - **거래 종료 안내** (2383-2397줄) → `TradeEndedBanner`

### 4.6 스타일 정의
- ❌ **추출 가능**: 인라인 스타일 정의 (1535-1544줄) → `ChatPageStyles` 또는 CSS 모듈

---

## 5. Hooks/State Groups That Can Be Extracted

### 5.1 채팅방 데이터 관리
**현재 위치**: 427-609줄, 620-741줄  
**추출 후**: `useChatRoom(chatRoomId, myUid)`
- room 상태
- product 상태
- productMissing 상태
- productStatus 상태
- room 실시간 구독
- productSnapshot 동기화
- unreadCount 초기화
- 읽음 처리

### 5.2 메시지 목록 관리
**현재 위치**: 620-741줄  
**추출 후**: `useMessages(chatRoomId, myUid)`
- messages 상태
- messages 실시간 구독
- 중복 메시지 방지 (Map 기반)
- 읽음 표시 업데이트
- 자동 읽기 모드 (TTS)

### 5.3 입력 상태 관리
**현재 위치**: 144줄, 381-421줄  
**추출 후**: `useChatInput(chatRoomId, myUid, room, messages)`
- text 상태
- suggestions 상태
- isLoadingSuggestions 상태
- 추천 문장 로드 로직
- textRef (무한루프 방지)

### 5.4 권한 및 접근 제어
**현재 위치**: 777-825줄  
**추출 후**: `useChatRoomAccess(room, myUid)`
- 참여자 확인
- 접근 권한 검증
- navigate 처리

### 5.5 미디어 업로드 상태
**현재 위치**: 152-153줄, 2524-2559줄  
**추출 후**: `useMediaUpload(chatRoomId, myUid, room)`
- isUploadingImages 상태
- isUploadingVideos 상태
- 이미지 업로드 핸들러
- 동영상 업로드 핸들러

### 5.6 거래 관리 (중고거래 전용)
**현재 위치**: 1037-1178줄  
**추출 후**: `useTradeReservation(room, myUid, chatRoomId)`
- isReserving 상태
- handleReserve 함수
- handleCancelReserve 함수

### 5.7 iOS/모바일 최적화
**현재 위치**: 191-265줄  
**추출 후**: `useMobileKeyboardFix()`
- --vh CSS 변수 설정
- 키보드 감지 및 스크롤 보정
- visualViewport 이벤트 리스너

### 5.8 STT/TTS 통합
**현재 위치**: 160-186줄, 268-315줄, 1181-1250줄, 1253-1331줄  
**추출 후**: `useChatVoice(chatRoomId, myUid, room, messages)`
- STT 훅 통합
- TTS 훅 통합
- iOS/PWA 체크 함수들
- handleSTTStart 함수
- handleSummaryTTS 함수
- handleStopTTS 함수
- showSTTGuide 상태

---

## 6. Firebase Calls That Should Move Into Services

### 6.1 채팅방 관련
**현재 위치**: 435-609줄  
**서비스로 이동**: `src/features/chat/services/chatRoomService.ts`
- `onSnapshot(roomRef)` → `subscribeChatRoom(chatRoomId, callback)`
- `updateDoc(roomRef, { unreadCount })` → `resetUnreadCount(chatRoomId, uid)`
- `getDoc(postRef)` → `getMarketPost(postId)`
- `getDoc(joinRef)` → `getMarketJoin(postId, uid)`

### 6.2 메시지 관련
**현재 위치**: 623-741줄, 919-1027줄, 828-917줄, 1363-1428줄  
**서비스로 이동**: `src/features/chat/services/messageService.ts`
- `onSnapshot(messagesQuery)` → `subscribeMessages(chatRoomId, callback, limit)`
- `updateDoc(msgRef, { readBy })` → `markMessageRead(chatRoomId, messageId, uid)`
- `sendMessageCommon()` → 이미 서비스화됨, 하지만 호출부 정리 필요
- `sendImageMessage()` → 이미 서비스화됨
- `sendVideoMessage()` → 이미 서비스화됨

### 6.3 거래 관련 (중고거래 전용)
**현재 위치**: 1037-1178줄  
**서비스로 이동**: `src/features/market/services/tradeService.ts`
- `updateDoc(productRef, { status, buyerId })` → `reserveProduct(productId, buyerId)`
- `updateDoc(productRef, { status: "active", buyerId: null })` → `cancelReservation(productId)`
- `updateDoc(roomRef, { "productSnapshot.status" })` → `updateProductSnapshot(chatRoomId, status)`

### 6.4 알림 관련
**현재 위치**: 899-909줄, 986-996줄, 1410-1420줄, 1482-1513줄  
**서비스로 이동**: `src/features/notifications/services/notificationService.ts`
- `createChatNoti()` → 이미 서비스화됨, 하지만 호출부 정리 필요
- `createNoti()` → 이미 서비스화됨

---

## 7. Media/Voice/Location Related Logic

### 7.1 이미지 처리
**현재 위치**: 2524-2559줄  
**로직**:
- 다중 파일 선택 (`multiple` 속성)
- `sendImageMessage()` 호출
- 업로드 상태 관리 (`isUploadingImages`)
- input 초기화 (같은 파일 재선택 가능)

**추출 후**: `useImageUpload(chatRoomId, myUid, room)` 훅 또는 `handleImageUpload()` 함수

### 7.2 동영상 처리
**현재 위치**: (코드에서 명시적으로 보이지 않음, `sendVideoMessage` import만 존재)  
**로직**:
- `sendVideoMessage()` 호출
- 업로드 상태 관리 (`isUploadingVideos`)

**추출 후**: `useVideoUpload(chatRoomId, myUid, room)` 훅

### 7.3 위치 공유
**현재 위치**: 1431-1521줄  
**로직**:
- `getUserLocation()` 호출
- Google Maps 링크 생성 (`https://www.google.com/maps?q=${lat},${lng}`)
- 위치 메시지 전송 (`type: "location"`)
- 알림 생성
- 중복 실행 방지 (`shareLocationRef`)

**추출 후**: `useLocationShare(chatRoomId, myUid, room)` 훅 또는 `shareLocationService.ts`

### 7.4 STT (음성 인식)
**현재 위치**: 160-186줄, 268-315줄, 1181-1250줄  
**로직**:
- iOS/PWA 체크 (`getIsIOS()`, `getIsPWA()`, `getCanUseSTT()`)
- 마이크 권한 확인 (`getUserMedia`)
- `useSTT()` 훅 사용
- 인식 결과 즉시 전송 (`handleVoiceMessageSend`)
- STT 연타 방지 (`shouldSendSTTMessage`)
- iOS Safari 안내 모달 (`showSTTGuide`)

**추출 후**: `useChatSTT(chatRoomId, myUid, room)` 훅

### 7.5 TTS (음성 합성)
**현재 위치**: 612-617줄, 1253-1331줄, 1349-1360줄  
**로직**:
- `useTTS()` 훅 사용
- 요약 생성 및 재생 (`handleSummaryTTS`)
- 추천 문장 읽기 (`handleSuggestionLongPress`)
- 자동 읽기 모드 (`autoTTS` 상태, 새 메시지 자동 읽기)

**추출 후**: `useChatTTS(messages, myUid)` 훅

---

## 8. Group Chat / Team Chat Related Logic

### 8.1 채팅방 타입 분기
**현재 위치**: 321-328줄  
**로직**:
- `roomType` 계산: `room.type || (room.postId ? "recruit_group" : "trade")`
- `isRecruitGroup`, `isTrade`, `isTeam` 플래그

**추출 후**: `useChatRoomType(room)` 훅 또는 유틸 함수

### 8.2 모집 단체방 특수 로직
**현재 위치**: 다수 위치에 분산  
**로직**:
- **헤더**: `RecruitGroupChatHeader`, `HostPanel` 렌더링
- **메시지 렌더링**: `RecruitGroupMessageItem` 사용, notice/event/summary/report/attendance 카드 지원
- **멤버 관리**: `room.members` 배열, `room.roles` 객체
- **마감 체크**: `room.recruitStatus === "CLOSED" || room.status === "closed"` 시 입력 제한
- **알림 타겟**: 나를 제외한 모든 members

**추출 후**: `useRecruitGroupChat(room, myUid)` 훅

### 8.3 팀 채팅 특수 로직
**현재 위치**: 1579-1585줄  
**로직**:
- **헤더**: `TeamChatHeader` 렌더링
- **고정 공지**: `PinnedNoticeHeader` 렌더링
- **메시지 렌더링**: 모집 단체방과 동일한 로직 사용

**추출 후**: `useTeamChat(room, myUid)` 훅

### 8.4 중고거래 특수 로직
**현재 위치**: 다수 위치에 분산  
**로직**:
- **헤더**: `ChatHeader` 렌더링, 상품 정보 표시
- **메시지 렌더링**: 일반 말풍선 스타일, 내 메시지/상대 메시지 구분
- **알림 타겟**: 1:1 (otherUid 계산)
- **예약 기능**: `handleReserve()`, `handleCancelReserve()`
- **상품 상태 동기화**: `productSnapshot` 기반

**추출 후**: `useTradeChat(room, myUid)` 훅

---

## 9. Estimated Extraction Order

### Phase 1: UI 컴포넌트 분리 (낮은 리스크)
**우선순위**: 높음  
**예상 기간**: 2-3일

1. **TTS 요약 버튼** (1616-1675줄) → `TTSSummaryButton`
   - 독립적, props만 전달
   - 리스크: 낮음

2. **메시지 타입별 컴포넌트** (1800-2204줄)
   - `LocationMessage` (1837-1902줄)
   - `VideoMessage` (1905-2056줄)
   - `ImageMessage` (2059-2153줄)
   - `TextMessage` (2155-2202줄)
   - `SystemMessage` (1806-1834줄)
   - 리스크: 낮음-중간 (props 전달 주의)

3. **메시지 리스트 컨테이너** (1678-2235줄) → `MessageListContainer`
   - 리스크: 중간 (스크롤 로직 포함)

4. **추천 문장 바** (2238-2380줄) → `SuggestionBar`
   - 리스크: 낮음-중간 (롱프레스 이벤트 주의)

5. **입력 바** (2494-2683줄) → `ChatInputBar`
   - 리스크: 중간 (파일 업로드 로직 포함)

6. **모달/배너** (2400-2491줄, 2686-2701줄, 2383-2397줄)
   - `STTGuideModal`
   - `IOSSTTBanner`
   - `TradeEndedBanner`
   - 리스크: 낮음

### Phase 2: 커스텀 훅 추출 (중간 리스크)
**우선순위**: 높음  
**예상 기간**: 3-4일

1. **iOS/모바일 최적화 훅** (191-265줄) → `useMobileKeyboardFix()`
   - 독립적, 사이드 이펙트만
   - 리스크: 낮음

2. **채팅방 데이터 훅** (427-609줄) → `useChatRoom(chatRoomId, myUid)`
   - 리스크: 높음 (다른 로직과 강하게 결합)

3. **메시지 목록 훅** (620-741줄) → `useMessages(chatRoomId, myUid)`
   - 리스크: 높음 (읽음 처리, 자동 읽기 모드 포함)

4. **입력 상태 훅** (381-421줄) → `useChatInput(chatRoomId, myUid, room, messages)`
   - 리스크: 중간 (추천 문장 로직 포함)

5. **권한 체크 훅** (777-825줄) → `useChatRoomAccess(room, myUid)`
   - 리스크: 낮음-중간

6. **미디어 업로드 훅** (2524-2559줄) → `useMediaUpload(chatRoomId, myUid, room)`
   - 리스크: 중간

7. **거래 관리 훅** (1037-1178줄) → `useTradeReservation(room, myUid, chatRoomId)`
   - 리스크: 중간 (중고거래 전용)

8. **음성 기능 훅** (160-186줄, 268-315줄, 1181-1250줄, 1253-1331줄) → `useChatVoice(chatRoomId, myUid, room, messages)`
   - 리스크: 높음 (STT/TTS 통합, iOS 체크)

### Phase 3: 서비스 레이어 구축 (중간-높은 리스크)
**우선순위**: 중간  
**예상 기간**: 2-3일

1. **채팅방 서비스** → `chatRoomService.ts`
   - `subscribeChatRoom()`
   - `resetUnreadCount()`
   - `getMarketPost()`
   - `getMarketJoin()`
   - 리스크: 중간

2. **메시지 서비스** → `messageService.ts`
   - `subscribeMessages()`
   - `markMessageRead()`
   - 리스크: 중간 (이미 일부 서비스화됨)

3. **거래 서비스** → `tradeService.ts`
   - `reserveProduct()`
   - `cancelReservation()`
   - `updateProductSnapshot()`
   - 리스크: 중간 (중고거래 전용)

### Phase 4: 채팅방 타입별 로직 분리 (높은 리스크)
**우선순위**: 낮음 (Phase 1-3 완료 후)  
**예상 기간**: 3-4일

1. **채팅방 타입 훅** → `useChatRoomType(room)`
2. **모집 단체방 훅** → `useRecruitGroupChat(room, myUid)`
3. **팀 채팅 훅** → `useTeamChat(room, myUid)`
4. **중고거래 훅** → `useTradeChat(room, myUid)`

**리스크**: 높음 (다른 로직과 강하게 결합)

---

## 10. Risk Points During Refactor

### 10.1 실시간 구독 로직
**위험도**: ⚠️⚠️⚠️ 매우 높음  
**위치**: 427-609줄 (room), 620-741줄 (messages)

**리스크**:
- `onSnapshot` cleanup 누락 시 메모리 누수
- 무한 루프 (updateDoc → onSnapshot 재트리거)
- 네트워크 재연결 시 중복 구독
- cleanup 플래그 (`isUnmounted`) 누락

**대응 방안**:
- cleanup 함수 반드시 확인
- ref 기반 무한 루프 방지 로직 유지
- 테스트: 네트워크 끊김/재연결 시나리오

### 10.2 Optimistic Update 로직
**위험도**: ⚠️⚠️⚠️ 매우 높음  
**위치**: 868-916줄, 956-1026줄, 1382-1427줄

**리스크**:
- 임시 메시지(`temp-`)와 실제 메시지 중복
- 전송 실패 시 UI 상태 불일치
- onSnapshot과 optimistic update 충돌

**대응 방안**:
- Map 기반 중복 제거 로직 유지 (636-664줄)
- pending 상태 관리 정확히 유지
- 실패 시 롤백 로직 확인

### 10.3 읽음 처리 로직
**위험도**: ⚠️⚠️⚠️ 매우 높음  
**위치**: 424-566줄, 667-694줄, 744-763줄, 766-771줄

**리스크**:
- 무한 루프 (읽음 처리 → onSnapshot 재트리거 → 읽음 처리)
- 중복 읽음 처리 (여러 곳에서 호출)
- 스크롤 기반 읽음 처리와 입장 시 읽음 처리 충돌

**대응 방안**:
- `unreadInitializedRef` 기반 중복 방지 로직 유지
- `useChatRead` 훅과의 통합 주의
- 테스트: 빠른 스크롤, 입장/퇴장 시나리오

### 10.4 채팅방 타입 분기
**위험도**: ⚠️⚠️ 중간-높음  
**위치**: 321-328줄, 다수 위치에 분산

**리스크**:
- 타입 분기 로직 누락 시 렌더링 오류
- 하위 호환성 문제 (레거시 채팅방)

**대응 방안**:
- 타입 체크 로직 중앙화
- 하위 호환 필드 확인 (`room.postId`, `room.type`)

### 10.5 iOS/모바일 최적화
**위험도**: ⚠️⚠️ 중간  
**위치**: 191-265줄, 1551-1553줄

**리스크**:
- 키보드 대응 로직 누락 시 UI 깨짐
- `--vh` CSS 변수 미설정 시 레이아웃 오류

**대응 방안**:
- `useMobileKeyboardFix()` 훅으로 분리 후 테스트
- iOS Safari, Android Chrome 테스트

### 10.6 STT/TTS 통합
**위험도**: ⚠️⚠️⚠️ 매우 높음  
**위치**: 160-186줄, 268-315줄, 1181-1250줄

**리스크**:
- iOS/PWA 체크 로직 누락 시 STT 오류
- 마이크 권한 확인 누락
- STT 연타 방지 로직 누락
- 순환 참조 (speech.ts import 제거됨)

**대응 방안**:
- 인라인 함수 유지 (순환 참조 방지)
- 권한 체크 로직 유지
- `sttGuard` 서비스 확인

### 10.7 상태 의존성 체인
**위험도**: ⚠️⚠️⚠️ 매우 높음  
**위치**: 전체

**리스크**:
- useState 간 의존성 체인 복잡
- useMemo 의존성 배열 오류
- 무한 루프 (text → suggestions → text)

**대응 방안**:
- 의존성 그래프 문서화
- ref 기반 무한 루프 방지 로직 유지 (381-421줄)
- 단계별 테스트

### 10.8 파일 업로드 로직
**위험도**: ⚠️⚠️ 중간  
**위치**: 2524-2559줄

**리스크**:
- 업로드 상태 관리 누락
- input 초기화 누락 (같은 파일 재선택 불가)
- 타입 분기 로직 누락 (trade vs recruit_group)

**대응 방안**:
- `useMediaUpload` 훅으로 분리 후 테스트
- input 초기화 로직 유지

### 10.9 위치 공유 로직
**위험도**: ⚠️⚠️ 중간  
**위치**: 1431-1521줄

**리스크**:
- 중복 실행 방지 로직 누락 (`shareLocationRef`)
- 타입 분기 로직 누락
- Google Maps 링크 생성 오류

**대응 방안**:
- ref 기반 중복 방지 로직 유지
- 타입 체크 로직 확인

### 10.10 거래 관리 로직 (중고거래 전용)
**위험도**: ⚠️⚠️ 중간  
**위치**: 1037-1178줄

**리스크**:
- 상품 상태 업데이트와 productSnapshot 동기화 누락
- 권한 체크 누락 (판매자만 예약 가능)

**대응 방안**:
- `useTradeReservation` 훅으로 분리 후 테스트
- 권한 체크 로직 유지

---

## 11. 추가 고려사항

### 11.1 성능 최적화
- 메시지 목록 limit 30개 유지 (624줄)
- 읽음 처리 최근 10개만 (674줄)
- Map 기반 중복 제거 (636-664줄)

### 11.2 에러 처리
- 네트워크 에러 조용히 처리 (592-596줄, 720-724줄)
- 권한 오류만 로그 (598-601줄, 726-729줄)
- 사용자 친화적 에러 메시지 (1014-1021줄)

### 11.3 하위 호환성
- 레거시 필드 지원 (`room.postId`, `room.type`, `room.recruitStatus`)
- productSnapshot 기반 상품 정보 (570-589줄)

### 11.4 테스트 전략
- 단위 테스트: 각 훅/서비스 함수
- 통합 테스트: 메시지 전송, 읽음 처리, 실시간 동기화
- E2E 테스트: 전체 채팅 플로우 (iOS/Android)

---

## 12. 결론

ChatPage.tsx는 **2,710줄의 거대한 단일 파일**로, 다음과 같은 특징이 있습니다:

1. **복잡도**: 매우 높음 (15개 useState, 7개 useRef, 다수 useEffect)
2. **책임**: 과다 (UI, 상태 관리, Firebase, STT/TTS, 미디어, 거래 관리)
3. **결합도**: 높음 (상태 간 강한 의존성)
4. **재사용성**: 낮음 (컴포넌트/로직 분리 어려움)

**리팩토링 전략**:
- **Phase 1**: UI 컴포넌트 분리 (낮은 리스크)
- **Phase 2**: 커스텀 훅 추출 (중간 리스크)
- **Phase 3**: 서비스 레이어 구축 (중간-높은 리스크)
- **Phase 4**: 채팅방 타입별 로직 분리 (높은 리스크)

**핵심 주의사항**:
- 실시간 구독 cleanup 반드시 확인
- Optimistic Update 로직 정확히 유지
- 읽음 처리 무한 루프 방지
- iOS/모바일 최적화 로직 유지
- 하위 호환성 보장

**예상 기간**: 10-14일 (단계별 진행)
