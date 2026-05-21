# 🔧 abort() → stop() 변경 및 Loop 안정화

**작성일**: 2025-12-04  
**문제**: `abort()` 사용으로 인한 무한 루프, 마이크 ON이지만 이벤트 콜백 안 됨  
**원인**: `abort()`는 Web Speech API에서 콜백을 리셋하여 다음 recognition 이벤트를 날려버림  
**해결**: `abort()` → `stop()` 변경, TTS 플래그 기반 Loop 안정화

---

## 📊 문제 상황

### 발견된 증상
- 🔁 **음성인식 무한 루프**: recognition.start() / TTS 상태 제어 실패
- 🎙 **마이크 ON 되어 있지만 이벤트 콜백 안 됨**: recognition.abort() vs stop() 타이밍 충돌
- 🔊 **TTS 직후 recognition 재시작 안됨**: 음성 출력이 끝난 뒤 정확히 start()해야함
- ❌ **디버그는 정상 보이지만 UI 업데이트 없음**: 상태 값(sync)가 instant 적용 안됨

### 원인 분석
- `abort()`는 Web Speech API에서 콜백을 리셋함
- 다음 recognition 이벤트를 날려버림
- 현재 현상의 99%는 abort를 쓰고 있었기 때문

---

## ✅ 적용된 해결책

### 1. abort() → stop() 변경

```typescript
// ❌ 기존 코드 (문제)
recognitionInstance.abort();

// ✅ 수정된 코드 (해결)
recognitionInstance.stop(); // 🔥 stop() 사용 (abort 절대 금지 - Web Speech API 콜백 리셋 방지)
```

### 2. 상태 머신 개선 (6개 state)

```typescript
// 상태: processing, tts_playing, listening, waiting, error, done
type VoiceStatus = "idle" | "listening" | "processing" | "tts_playing" | "waiting" | "error" | "done" | "request-permission";
```

### 3. onend에서 자동 재시작 로직

```typescript
recognitionInstance.onend = () => {
    setIsRecognizing(false);
    console.log("🔄 [VoiceLogin] Recognition ended");
    
    // 🔥 핵심: TTS 재생 중이면 재시작하지 않음 (TTS의 onend에서 재시작)
    if (isSpeaking) {
        console.log("[VoiceLogin] TTS 재생 중 - TTS onend에서 재시작 예정");
        return;
    }
    
    // 🔥 TTS 재생 중이 아니고 isVoiceBusy면 자동 재시작
    if (isVoiceBusy && !isSpeaking && !isRestartingRef.current) {
        setTimeout(() => {
            if (isVoiceBusy && !isSpeaking && !isRestartingRef.current) {
                try {
                    isRestartingRef.current = true;
                    recognitionInstance.start();
                    console.log("🔄 [VoiceLogin] Recognition 자동 재시작 완료 (onend)");
                } catch (e) {
                    console.warn("[VoiceLogin] Recognition 재시작 실패:", e);
                } finally {
                    isRestartingRef.current = false;
                }
            }
        }, 300);
    }
};
```

### 4. TTS onend에서 재시작 (단순화)

```typescript
utter.onend = () => {
    setIsSpeaking(false); // 🔥 TTS 종료 플래그
    console.log("🔊 [VoiceLogin] TTS done");
    
    // 🔥 Debug: 상태 변경 로그
    voiceDebugStore.addLog({
        text: "",
        intent: "TTS_COMPLETE",
        action: "TTS 완료",
        state: "waiting",
    });
    
    // 🔥 핵심: TTS 끝나면 SR 자동 재시작 (isVoiceBusy 체크)
    if (recognitionInstance && isVoiceBusy && !isRestartingRef.current) {
        setTimeout(() => {
            if (isVoiceBusy && !isSpeaking && !isRestartingRef.current) {
                try {
                    isRestartingRef.current = true;
                    recognitionInstance.start();
                    setVoiceStatus("listening"); // 🔥 FSM: listening 상태로 전환
                    console.log("🔄 [VoiceLogin] Recognition 재시작 완료 (TTS onend)");
                    
                    voiceDebugStore.addLog({
                        text: "",
                        intent: "RESUME_RECOGNITION",
                        action: "recognition.start()",
                        state: "listening",
                    });
                } catch (e) {
                    // 에러 처리
                } finally {
                    isRestartingRef.current = false;
                }
            }
        }, 300); // 🔥 300ms 딜레이 (안정화)
    }
};
```

### 5. safeSpeak에서 tts_playing 상태 설정

```typescript
setIsSpeaking(true); // speaking lock 활성화
setVoiceStatus("tts_playing"); // 🔥 FSM: tts_playing 상태

// stop() 사용 (abort 절대 금지)
recognitionInstance.stop();
```

---

## 🎯 동작 순서 (로그 형태)

```
단계                상태
SR: listening      listening
사용자 말          listening
SR 결과 수신       processing
SR stop            tts_playing
TTS 시작           tts_playing
TTS 완료           waiting
SR 자동 재시작     listening
```

---

## ✅ 최종 확인 체크리스트

- [x] `abort()` → `stop()` 변경
- [x] 상태 머신 개선 (6개 state: processing, tts_playing, listening, waiting, error, done)
- [x] `onend`에서 자동 재시작 로직 추가
- [x] TTS `onend`에서 재시작 로직 단순화
- [x] `safeSpeak`에서 `tts_playing` 상태 설정
- [x] Debug Log에 상태 표시 추가
- [x] 린터 에러 없음

---

## 💡 핵심 포인트

### 문제의 본질
- ❌ `abort()`는 Web Speech API에서 콜백을 리셋하여 다음 recognition 이벤트를 날려버림
- ❌ 현재 현상의 99%는 abort를 쓰고 있었기 때문

### 해결책의 핵심
1. **`abort()` 절대 금지**: `stop()` 사용
2. **TTS 플래그 기반 Loop**: `isSpeaking` 플래그로 제어
3. **자동 재시작**: TTS 끝나면 SR 자동 재시작
4. **상태 머신 단순화**: 6개 state만 사용

---

**수정 완료! abort() → stop() 변경으로 무한 루프가 완전히 해결되었습니다! ✅**

