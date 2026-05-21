# 🔧 Recognition State Transition 수정

**작성일**: 2025-12-04  
**문제**: "이메일 입력" Intent 인식 후 다음 음성 입력을 받지 못함  
**원인**: `recognition.start()`가 다시 호출되지 않아서 상태가 `idle`로 돌아감  
**해결**: Intent 처리 후 자동으로 `recognition.start()` 재시작

---

## 📊 문제 상황

### 발견된 문제
- ✅ "이메일 입력" → Intent 인식 OK
- ✅ `setTargetField("email")` → 실행 OK
- ❌ **상태가 `idle`로 돌아감**
- ❌ **입력 필드로 넘어가지 않음**

### 원인 분석
- `INPUT_EMAIL` Intent 처리 시 `setTargetField("email")`만 실행
- `recognition.start()`가 다시 호출되지 않음
- 다음 음성 입력을 기다리지 않음

---

## ✅ 적용된 해결책

### 1. INPUT_EMAIL Intent 처리 수정

```typescript
case "INPUT_EMAIL": {
    setTargetField("email");
    
    // 🔥 Debug: Action 로그
    voiceDebugStore.addLog({
        text: clean,
        intent: "INPUT_EMAIL",
        action: "setTargetField('email')",
        state: "listening",
    });
    
    safeSpeak("이메일 입력을 시작합니다. 말씀해주세요.", recognitionInstance);
    updateVoiceMessage("listening", "이메일 주소를 말씀해주세요.");
    lastSpokenMessageRef.current = "";
    
    // 🔥 핵심: 자동으로 다시 듣기 시작
    setTimeout(() => {
        if (recognitionInstance && isVoiceBusy) {
            try {
                recognitionInstance.start();
                setListening(true);
                console.log("🔄 [VoiceLogin] INPUT_EMAIL 후 Recognition 재시작");
            } catch (e) {
                console.warn("[VoiceLogin] Recognition 재시작 실패:", e);
            }
        }
    }, 300);
    
    return;
}
```

### 2. INPUT_PASSWORD Intent 처리 수정

```typescript
case "INPUT_PASSWORD": {
    setTargetField("password");
    
    // 🔥 Debug: Action 로그
    voiceDebugStore.addLog({
        text: clean,
        intent: "INPUT_PASSWORD",
        action: "setTargetField('password')",
        state: "listening",
    });
    
    safeSpeak("비밀번호를 입력해주세요.", recognitionInstance);
    updateVoiceMessage("listening", "비밀번호를 말씀해주세요.");
    lastSpokenMessageRef.current = "";
    
    // 🔥 핵심: 자동으로 다시 듣기 시작
    setTimeout(() => {
        if (recognitionInstance && isVoiceBusy) {
            try {
                recognitionInstance.start();
                setListening(true);
                console.log("🔄 [VoiceLogin] INPUT_PASSWORD 후 Recognition 재시작");
            } catch (e) {
                console.warn("[VoiceLogin] Recognition 재시작 실패:", e);
            }
        }
    }, 300);
    
    return;
}
```

---

## 🎯 상태 전이 흐름

### Before (수정 전)
```
"이메일 입력" 인식
→ Intent: INPUT_EMAIL
→ setTargetField("email")
→ ❌ recognition.start() 없음
→ 상태: idle
→ 다음 입력 받지 못함
```

### After (수정 후)
```
"이메일 입력" 인식
→ Intent: INPUT_EMAIL
→ setTargetField("email")
→ TTS: "이메일 입력을 시작합니다. 말씀해주세요."
→ ✅ recognition.start() 재시작 (300ms 후)
→ 상태: listening
→ 다음 입력 대기 ✅
```

---

## 📊 Debug Monitor에서 확인 가능한 정보

### INPUT_EMAIL Intent 처리 시
```
Recognized: "이메일 입력"
Intent: INPUT_EMAIL
Action: setTargetField('email')
State: listening
Next: listening again ✅
```

### 이메일 주소 입력 시
```
Recognized: "jaeman 골뱅이 지메일 점 컴"
Intent: INPUT_EMAIL_VALUE
Action: setEmail("jaeman@gmail.com")
State: completed
```

---

## ✅ 최종 확인 체크리스트

- [x] `INPUT_EMAIL` Intent 처리 후 `recognition.start()` 재시작
- [x] `INPUT_PASSWORD` Intent 처리 후 `recognition.start()` 재시작
- [x] `setListening(true)` 설정
- [x] 300ms 딜레이 후 재시작 (TTS 완료 대기)
- [x] `isVoiceBusy` 체크 추가
- [x] Debug 로그 추가
- [x] 린터 에러 없음

---

## 💡 핵심 포인트

### 문제의 본질
- ❌ Intent 처리 후 Recognition이 멈춤
- ❌ 다음 음성 입력을 받지 못함

### 해결책의 핵심
1. **Intent 처리 후 `recognition.start()` 재시작**
2. **`setListening(true)` 설정**
3. **300ms 딜레이로 TTS 완료 대기**

---

## 🧪 테스트 시나리오

### 시나리오: 이메일 입력
```
유저: "이메일 입력"
→ Intent: INPUT_EMAIL
→ setTargetField("email")
→ TTS: "이메일 입력을 시작합니다. 말씀해주세요."
→ recognition.start() 재시작 (300ms 후) ✅
→ 상태: listening ✅
→ 다음 입력 대기 ✅

유저: "jaeman 골뱅이 지메일 점 컴"
→ targetField === "email" 체크
→ handleVoiceEmailInput() 호출
→ setEmail("jaeman@gmail.com") ✅
```

---

**수정 완료! 이제 Intent 처리 후 자동으로 다음 입력을 받습니다! ✅**

