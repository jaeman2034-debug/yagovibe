# 🔒 Speech System Invariants (불변성 선언)

## Invariant A — 단일 진입점

**SpeechManager.startListeningByUserGesture()** // 오직 여기만

❌ 금지:
- page / hook / component에서 직접 호출
- effect 자동 실행
- startSpeech / startSTT 직접 호출

✅ 허용:
- VoiceMicButton에서만 user gesture로 호출

## Invariant B — 1 Command = 1 Action = 1 Stop

```
onSTTResult(transcript) {
  handleCommand(transcript)
  SpeechManager.stopAll() // 즉시 중지
}
```

❌ 금지:
- 재시작
- navigate 후 음성 유지
- 실패 시 자동 재시도

## Invariant C — Desktop = Hard No

```
if (!isMobileDevice()) return NO_OP;
```

❌ Desktop에서:
- UI 렌더링 안 됨
- 권한 요청 안 됨
- 엔진 import 안 됨

✅ Desktop 로그:
- `[Speech] disabled (desktop)` 단 한 줄만

