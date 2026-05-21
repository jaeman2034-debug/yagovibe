# 채팅 배포 전 검증 (4항목)

## 1. 채팅방 목록 쿼리 에러 여부

- **쿼리**: `chatRooms` where `participants` array-contains myUid, orderBy `lastMessageAt` desc, limit 50
- **인덱스**: `firestore.indexes.json`에 participants + lastMessageAt, members + lastMessageAt 복합 인덱스 추가됨
- **규칙**: `chatRooms` read는 `isChatRoomMember(roomId)` — 쿼리 결과(participants에 포함된 방)는 모두 통과
- **결과**: OK

## 2. 2개 이상 디바이스 로그인 시 푸시 수신

- **구현**: `onMessageCreated`가 `users/{uid}/devices` 서브컬렉션에서 token 수집 후 `sendEachForMulticast(tokens)` 호출
- **다중 디바이스**: 디바이스별 문서 → 여러 토큰 → 모두 전송
- **결과**: OK (런타임은 실제 2기기로 확인 권장)

## 3. 비참여자가 방/메시지 접근 불가

- **규칙**: `chatRooms/{roomId}` 및 `messages` read → `isChatRoomMember(roomId)` (members 또는 participants에 uid 포함 여부)
- **결과**: OK

## 4. 비작성자가 메시지 수정·삭제 불가

- **규칙**: messages `update` — 발신자만 전체 수정 가능; 참여자는 `readBy`, `reactions` 필드만 수정 가능. messages `delete` — 발신자만 가능
- **결과**: OK

---

*검증일: 배포 시점*
