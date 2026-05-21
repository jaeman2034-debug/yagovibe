# YAGO VIBE Cloud Functions E2E 실전 테스트 가이드

## 사전 준비

- `functions` 폴더에서 `npm run build` 완료
- Firebase CLI 설치 및 로그인 완료

---

## STEP 1 — Emulator 실행

```powershell
cd c:\Users\samsung256g\Desktop\yago-vibe-spt
firebase emulators:start --only functions,firestore
```

**확인 사항:**

- `✔  All emulators ready!`
- 다음 함수 로드 확인: `onTeamCreated`, `onEventCreated`, `onEventAttendScore`, `onNoticeScore`
- Emulator UI: http://127.0.0.1:4001
- Functions 포트: 5001
- Firestore 포트: 8086

---

## STEP 2–5 — E2E 테스트 스크립트 실행

**새 터미널**에서:

```powershell
cd c:\Users\samsung256g\Desktop\yago-vibe-spt\functions
node scripts/e2e-trigger-test.js
```

---

## 예상 로그 (에뮬레이터 터미널 또는 http://127.0.0.1:4001/logs)

| 트리거 | 예상 로그 |
|--------|-----------|
| **onTeamCreated** | 🔥 [onTeamCreated] 팀 생성 감지 |
| **onEventCreated** | 📅 [onEventCreated] 이벤트 생성 감지 |
| **onEventAttendScore** | 🎟️ [onEventAttendScore] 이벤트 업데이트 감지 |
| **onEventAttendScore** | ✅ [onEventAttendScore] 모든 참석자 점수 적립 완료 |
| **onNoticeScore** | 📌 [onNoticeScore] 공지 생성 감지 |

---

## STEP 7 — 최종 검증 체크리스트

- [ ] 모든 Firestore 트리거 정상 실행
- [ ] 로거 메시지 정상 출력
- [ ] 런타임 에러 없음
- [ ] missing export 에러 없음
- [ ] duplicate initializeApp 경고 없음

---

## 트리거 경로 (변경 금지)

| 트리거 | 경로 |
|--------|------|
| onTeamCreated | `teams/{teamId}` onCreate |
| onEventCreated | `teams/{teamId}/events/{eventId}` onCreate |
| onEventAttendScore | `teams/{teamId}/events/{eventId}` onUpdate |
| onNoticeScore | `teams/{teamId}/notices/{noticeId}` onCreate |
