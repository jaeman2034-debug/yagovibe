# 🔒 릴리즈 체크리스트: PROD 봉인 (실수 방지)

> **⚠️ 중요:** 이 체크리스트는 Phase 5의 일부입니다.  
> 전체 Phase 5 체크리스트는 `src/speech/PHASE5_RELEASE_SEAL.md`를 참조하세요.

## 빠른 점검

```bash
npm run check:release-seal
```

## 1️⃣ DEV 도구 완전 차단

- [x] Eruda 제거 완료 (`index.html`)
- [x] 디버그 패널/로그 버튼은 `import.meta.env.DEV`로만
- [x] 콘솔 로그 레벨 정리 (DEV/PROD 분리)

## 2️⃣ Desktop 음성 완전 차단 재검증

- [x] 데스크탑에서 마이크 권한 팝업 0회
- [x] `VoiceMicButton` 렌더 자체 없음
- [x] `SpeechManager.startListeningByUserGesture()` 1차 가드
- [x] `speechEngine.listenOnce()` 3차 가드
- [x] Desktop 로그: `[Speech] disabled (desktop)` 단 한 줄만

## 3️⃣ "1 명령 = 1 액션 = 1 stop" 유지

- [x] STT 결과 처리 후 무조건 `SpeechManager.stopAll()` 호출
- [x] 자동 재시작 금지
- [x] Route 이동 시 STT 자동 중지

## 4️⃣ 개인정보/보안

- [x] PROD에서 transcript 원문 저장 금지 (해시만 저장)
- [x] 에러 로그에 transcript 원문 출력 금지 (DEV만)
- [x] Firestore 스키마: 해시 + 메타데이터만

## 5️⃣ 튕김 방지 최종 확인

- [x] `LoginPage` mounted 1회만 (unmounted 로그 없음)
- [x] `App.tsx` 조건부 렌더링 없음
- [x] `ProtectedRoute`/`PublicRoute` loading 시 `null` 반환

## 6️⃣ 음성 UX 실패 시나리오

- [x] no-speech: TTS 피드백 후 종료
- [x] UNKNOWN: UI 변화 없음, TTS 피드백만
- [x] 성공: UI 변경 후 즉시 STT 종료

---

**✅ 이 체크리스트를 모두 통과하면 PROD 배포 가능**

**📋 전체 Phase 5 체크리스트:** `src/speech/PHASE5_RELEASE_SEAL.md`

