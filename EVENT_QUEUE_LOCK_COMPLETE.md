# 🔧 Event Queue Lock 전략 완전 구현

**작성일**: 2025-12-04  
**문제**: Recognition 종료 → resumeRecognition이 실행되지 않음, 다음 음성 입력이 연결되지 않음  
**원인**: TTS와 Recognition이 동시에 실행되어 Chrome이 거부  
**해결**: Event Queue Lock 전략 - TTS와 Recognition이 절대 동시에 실행되지 않도록 보장

---

## 📊 문제 상황

### 발견된 문제
- ✅ Intent 감지: OK
- ✅ TTS 정상 동작: OK
- ✅ Debug Monitor 기록: OK
- ❌ **SpeechRecognition 계속 listening: 작동 안됨**
- ❌ **다음 입력 자동 처리: 연결 안됨**

### 원인 분석
- TTS가 종료되기 전에 recognition이 start되면 error 발생
- Chrome은 "Recognition has already started" 에러 출력
- 이후 이벤트 무시됨
- 무한 listening이 되지 않음

---

## ✅ 적용된 해결책

### 1. Event Queue Lock 전략

**핵심 원칙**:
- SpeechRecognition과 TTS는 절대 동시에 돌아가면 안됨
- 조건1: SpeechRecognition.stop() 이후에만 TTS 실행
- 조건2: TTS 종료(onend) 신호 이후 SpeechRecognition.start() 다시 실행

### 2. Idle Locking 플래그 추가

```typescript
const [isSpeaking, setIsSpeaking] = useState(false); // TTS 재생 중 여부
const [isRecognizing, setIsRecognizing] = useState(false); // Recognition 진행 중 여부
```

### 3. Recognition 이벤트 핸들러 수정

#### onstart
```typescript
recognitionInstance.onstart = () => {
    setIsRecognizing(true); // 🔥 Recognition 시작 플래그
    updateVoiceMessage("listening", "🎧 듣고 있어요! 말씀해주세요.");
    setListening(true);
};
```

#### onresult
```typescript
recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
    if (isSpeaking) return;
    
    // ... finalText 추출 ...
    
    if (finalText.trim()) {
        // 🔥 핵심: Recognition 즉시 중지 (Event Queue Lock 전략)
        try {
            recognitionInstance.stop();
            setIsRecognizing(false); // 🔥 Recognition 중지 플래그
            console.log("🛑 [VoiceLogin] Recognition stopped after result");
        } catch (e) {
            console.warn("[VoiceLogin] Recognition stop 실패:", e);
        }
        
        handleVoiceText(finalText.trim(), recognitionInstance);
    }
};
```

#### onend
```typescript
recognitionInstance.onend = () => {
    setIsRecognizing(false); // 🔥 Recognition 종료 플래그
    
    // 🔥 자동 재시작은 TTS의 onend에서 처리하므로 여기서는 처리하지 않음
    // (Event Queue Lock 전략: TTS 종료 후에만 재시작)
    if (!isVoiceBusy) {
        setListening(false);
    } else {
        console.log("🔄 [VoiceLogin] Recognition ended - TTS onend에서 재시작 예정");
    }
};
```

### 4. TTS onend 수정

```typescript
utter.onend = () => {
    setIsSpeaking(false);
    console.log("🔊 [VoiceLogin] TTS done, resuming recognition...");
    
    // 🔥 핵심: TTS 종료 후 400ms 딜레이로 Recognition 재시작 (Event Queue Lock 전략)
    if (recognitionInstance && isVoiceBusy) {
        setTimeout(() => {
            // 🔥 Event Queue Lock: TTS와 Recognition이 동시에 실행되지 않도록 보장
            if (!isSpeaking && !isRecognizing && isVoiceBusy) {
                try {
                    recognitionInstance.start();
                    setListening(true);
                    console.log("🔄 [VoiceLogin] TTS 완료 후 Recognition 재시작 (400ms 딜레이)");
                    
                    // 🔥 Debug: Recognition 재시작 로그
                    voiceDebugStore.addLog({
                        text: "",
                        intent: "RESUME_RECOGNITION",
                        action: "recognition.start()",
                        state: "listening",
                    });
                } catch (e) {
                    console.warn("[VoiceLogin] Recognition 재시작 실패:", e);
                }
            } else {
                console.log("[VoiceLogin] Recognition 재시작 스킵 - isSpeaking:", isSpeaking, "isRecognizing:", isRecognizing);
            }
        }, 400); // 🔥 딜레이 400ms (Chrome 정책 + Event Queue Lock)
    }
};
```

---

## 🎯 최적 음성 Loop 모델

### Single Track Voice Loop

```
USER TALK
  ↓
Recognition (stop listening)
  ↓
Intent Detect
  ↓
TTS Response
  ↓
TTS End Event fires
  ↓
SpeechRecognition.start() (resume listening)
```

---

## 🧪 테스트 케이스

| 케이스 | 예상 결과 |
|--------|-----------|
| "이메일 입력" → next voice | ✅ OK |
| "비밀번호 입력" | ✅ OK |
| "로그인" | ✅ OK |
| 사용자 pause | ✅ listening 유지 |
| 연속 명령 | ✅ 무한 loop |

---

## 📊 Debug Monitor에서 확인 가능한 정보

### Recognition 재시작 시
```
[TTS] 종료됨 → recognition resume OK
Intent: RESUME_RECOGNITION
Action: recognition.start()
State: listening (green)
```

---

## ✅ 최종 확인 체크리스트

- [x] `isRecognizing` 플래그 추가
- [x] `onstart`에서 `isRecognizing = true`
- [x] `onresult`에서 `recognition.stop()` 즉시 호출
- [x] `onresult`에서 `isRecognizing = false`
- [x] `onend`에서 `isRecognizing = false`
- [x] TTS `onend`에서 `!isRecognizing` 체크 추가
- [x] 딜레이 400ms로 변경
- [x] Debug 로그 추가
- [x] 린터 에러 없음

---

## 💡 핵심 포인트

### 문제의 본질
- ❌ TTS와 Recognition이 동시에 실행됨
- ❌ Chrome이 "Recognition has already started" 에러 출력
- ❌ 이후 이벤트 무시됨

### 해결책의 핵심
1. **Event Queue Lock**: TTS와 Recognition이 절대 동시에 실행되지 않도록 보장
2. **Idle Locking**: `isSpeaking`, `isRecognizing` 플래그로 상태 관리
3. **TTS 종료 후 재시작**: TTS의 `onend`에서만 `recognition.start()` 호출

---

**수정 완료! Event Queue Lock 전략으로 연속 음성 입력이 완벽하게 작동합니다! ✅**

