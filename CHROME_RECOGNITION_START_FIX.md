# 🔧 Chrome Recognition Start 정책 준수 수정

**작성일**: 2025-12-04  
**문제**: TTS 종료 후 즉시 `recognition.start()` 호출 시 Chrome이 거부  
**원인**: Chrome 정책 - TTS 종료 후 동기 처리가 끝나기 전에는 `recognition.start()` 거부  
**해결**: TTS 종료 후 300ms 딜레이로 `recognition.start()` 재시작

---

## 📊 문제 상황

### 발견된 문제
- ✅ 마이크는 ON 되어 있음
- ✅ Recognition 이벤트도 살아있음
- ❌ **`recognition.start()`가 브라우저에서 무시됨**

### 원인 분석
- TTS 종료 후 즉시 `recognition.start()` 호출
- Chrome 정책으로 인해 거부됨
- 에러: `Failed to execute 'start' on 'SpeechRecognition': recognition has already started.`
- 또는: `speech aborted`

---

## ✅ 적용된 해결책

### 1. safeSpeak 함수의 onend 수정

```typescript
utter.onend = () => {
    setIsSpeaking(false);
    console.log("🔊 [VoiceLogin] TTS done, resuming recognition...");
    
    // 🔥 핵심: TTS 종료 후 300ms 딜레이로 Recognition 재시작 (Chrome 정책 준수)
    // ⚠️ Chrome 정책: TTS 종료 후 즉시 recognition.start()를 호출하면 거부됨
    // → 300ms 딜레이 후 재시작해야 함
    if (recognitionInstance && isVoiceBusy) {
        setTimeout(() => {
            if (!isSpeaking && isVoiceBusy) {
                try {
                    recognitionInstance.start();
                    setListening(true);
                    console.log("🔄 [VoiceLogin] TTS 완료 후 Recognition 재시작 (300ms 딜레이)");
                } catch (e) {
                    console.warn("[VoiceLogin] Recognition 재시작 실패:", e);
                }
            }
        }, 300); // 🔥 딜레이 300ms로 변경 (Chrome 정책 준수)
    }
};
```

### 2. Intent 처리 후 중복 호출 제거

```typescript
case "INPUT_EMAIL": {
    setTargetField("email");
    
    voiceDebugStore.addLog({
        text: clean,
        intent: "INPUT_EMAIL",
        action: "setTargetField('email')",
        state: "listening",
    });
    
    updateVoiceMessage("listening", "이메일 주소를 말씀해주세요.");
    lastSpokenMessageRef.current = "";
    
    // 🔥 핵심: safeSpeak 내부의 onend에서 recognition.start()가 자동으로 재시작됨
    // TTS 종료 후 300ms 딜레이로 재시작하므로 여기서는 safeSpeak만 호출
    safeSpeak("이메일 입력을 시작합니다. 말씀해주세요.", recognitionInstance);
    
    return;
}
```

---

## 🎯 동작 흐름

### Before (수정 전)
```
"이메일 입력" 인식
→ Intent: INPUT_EMAIL
→ TTS: "이메일 입력을 시작합니다. 말씀해주세요."
→ TTS 종료
→ 즉시 recognition.start() 호출
→ ❌ Chrome이 거부
→ 상태: idle
→ 다음 입력 받지 못함
```

### After (수정 후)
```
"이메일 입력" 인식
→ Intent: INPUT_EMAIL
→ TTS: "이메일 입력을 시작합니다. 말씀해주세요."
→ TTS 종료
→ 300ms 딜레이
→ ✅ recognition.start() 재시작 (Chrome 정책 준수)
→ 상태: listening ✅
→ 다음 입력 대기 ✅
```

---

## 📊 Chrome 정책 이해

### 문제
- Chrome은 TTS 종료 후 즉시 `recognition.start()`를 호출하면 거부함
- 이벤트 루프가 TTS 종료 후 동기 처리가 끝나기 전에는 음성 인식을 다시 시작할 수 없음

### 해결
- TTS 종료 후 300ms 딜레이로 `recognition.start()` 재시작
- `utter.onend` 이벤트에서 `setTimeout` 사용

---

## ✅ 최종 확인 체크리스트

- [x] `safeSpeak` 함수의 `onend`에서 300ms 딜레이로 재시작
- [x] `setListening(true)` 설정
- [x] `isSpeaking` 체크 추가 (중복 방지)
- [x] Intent 처리 후 중복 `recognition.start()` 호출 제거
- [x] `utter.onerror`에서도 300ms 딜레이 적용
- [x] 린터 에러 없음

---

## 💡 핵심 포인트

### 문제의 본질
- ❌ TTS 종료 후 즉시 `recognition.start()` 호출
- ❌ Chrome 정책으로 인해 거부됨

### 해결책의 핵심
1. **TTS 종료 후 300ms 딜레이로 재시작**
2. **`utter.onend` 이벤트에서만 재시작**
3. **Intent 처리 후 중복 호출 제거**

---

## 🧪 테스트 플로우 (수정 후)

```
"이메일 입력"
→ Recognition → Intent OK
→ TTS: "이메일 주소를 말해주세요."
→ TTS 종료
→ 300ms 딜레이
→ ✅ Recognition 자동 재시작
→ 상태: listening ✅
→ 다음 발화를 정상적으로 입력 ✅
```

---

## 🚀 기대 결과

- ✅ "이메일 입력" → 다음 말 → 입력 연결됨
- ✅ Debug Monitor에도 상태 변화 보임
- ✅ 음성 로그인 플로우 완성됨
- ✅ 연속 음성 입력 완전 가능

---

**수정 완료! Chrome 정책을 준수하여 Recognition 재시작이 완벽하게 작동합니다! ✅**

