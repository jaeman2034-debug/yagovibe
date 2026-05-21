# Cursor Agent 지시문 — Firebase Functions 점검 및 정리

아래 블록 전체를 **복사해서 Cursor Agent에 붙여넣으면** 자동 점검·수정이 진행됩니다.

---

## 지시문 (복붙용)

```
현재 Firebase Emulator 환경이 정상적으로 실행되었습니다.

환경 상태:
- Auth Emulator: ON (9099)
- Firestore Emulator: ON (8086)
- Functions Emulator: ON (5001)
- Storage Emulator: ON (9200)
- Hosting Emulator: ON (5002)

Cloud Functions TypeScript build도 성공했고 lib 폴더가 생성되었습니다.

다음 작업을 수행하세요.

1️⃣ Functions 로딩 상태 확인

functions/src 전체를 스캔하여 다음 조건을 검증하세요.

- firebase-functions/v1 사용 여부
- firebase-functions/v2 import 제거 여부
- functions.firestore.document() 호출이 v1 기반인지 확인
- admin.initializeApp()가 index.ts에서 한 번만 호출되는지 확인

문제가 있으면 수정하세요.

2️⃣ DocumentSnapshot exists 오류 전체 수정

functions/src 폴더 전체에서 다음 패턴을 찾으세요.

.exists()

그리고 아래로 변경하세요.

.exists

단, Storage API의 file.exists() (메서드)는 제외하세요. DocumentSnapshot.exists는 메서드가 아니라 boolean property입니다.

3️⃣ Functions 코드 정리

다음 파일들을 확인하세요.

functions/src/team/onEventAttendScore.ts
functions/src/team/onNoticeScore.ts

확인 항목:

- firestore trigger 정상 작성
- snapshot.exists 사용 (메서드 호출 아님)
- null 체크
- 타입 오류 제거

4️⃣ 프로젝트 전체 빌드 검사

functions 디렉터리에서 다음 명령을 실행하여 TypeScript 빌드가 완전히 통과하도록 수정하세요.

cd functions && npm run build

빌드 에러가 발생하면:

- 타입 오류 수정
- exists() → exists
- 잘못된 import 수정
- v1 onCall 시그니처 (옵션 객체 없이 핸들러만)

5️⃣ Cloud Functions 구조 정리

functions/src 구조를 다음과 같이 유지하세요.

functions/src/
  index.ts
  team/
    onEventAttendScore.ts
    onNoticeScore.ts
    ...
  chat/
  market/
  notifications/

index.ts에서 필요한 모든 functions를 export하도록 확인하세요.

6️⃣ Emulator 테스트 준비

다음 Firestore trigger 테스트가 가능하도록 확인하세요.

테스트 시나리오:

- teams/{teamId}/events/{eventId} 업데이트 → onEventAttendScore 실행
- teams/{teamId}/notices/{noticeId} 생성 → onNoticeScore 실행

문제가 있으면 로그 기반으로 수정하세요.

7️⃣ Firestore Rules 기본 검증

chatRooms / messages / members 관련 rules가 다음 조건을 만족하는지 확인하세요.

- room member만 read/write 가능 (members 또는 participants 배열 기준)
- sender만 message update/delete 가능 (readBy, reactions는 참여자 허용)

필요하면 rules 초안을 보완하세요.

---

최종 목표:

- npm run build 성공 (functions 디렉터리)
- firebase emulators:start 실행 시 "User code failed to load" 에러 없음
- Firestore trigger 정상 동작

---

수정 후 반드시 다음을 실행하여 검증하세요:

cd functions
npm run build
firebase emulators:start --only functions

Functions가 정상 로드되는지 확인하세요.
```

---

## 효과

이 지시문으로 Agent가 다음을 자동 점검합니다.

| 항목 | 내용 |
|------|------|
| v1/v2 혼용 | firestore.document()는 v1, scheduler는 v2 등 일관성 확인 |
| .exists() | DocumentSnapshot.exists → 프로퍼티 사용으로 일괄 수정 |
| TS 빌드 | 타입/import 오류 수정 후 build 통과 |
| 구조 | team / chat / market / notifications 등 export 정리 |
| Rules | chatRooms, messages 권한 조건 검증 |

---

## 참고

- **file.exists()** (Storage File API)는 메서드이므로 `.exists`로 바꾸지 마세요.
- **v1 onCall**: `functions.https.onCall(handler)` — 옵션 객체는 v2 스타일이므로 v1에서는 제거.
- **scheduler**: v1에는 없으므로 dailyChatSummary, eventReminder, monthlyReport는 v2 유지.
