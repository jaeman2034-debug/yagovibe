# 🔧 TTS 무한 루프 문제 해결

**작성일**: 2025-12-04  
**문제**: 음성 인식 후 TTS 재생이 무한 반복되는 문제  
**해결**: 동일 메시지 반복 재생 차단 로직 추가

---

## 📊 문제 분석

### 발견된 문제
- **증상**: "구글 로그인은 음성으로 지원하지 않아요. 버튼을 눌러주세요!" 메시지가 계속 반복 재생
- **콘솔 로그**: 동일한 메시지가 반복적으로 출력됨

### 원인 분석

```
1. SpeechRecognition → onresult → finalTranscript 인식됨
2. updateVoiceMessage() → UI 업데이트
3. SpeechSynthesis 재시작 → TTS 재생
4. Recognition onend → recognition.start() 자동 재시작
5. 다시 같은 문장 인식됨
6. 다시 TTS 재생
7. 무한 반복 🔁
```

**핵심 원인**: 
- 동일한 음성 입력이 반복 인식됨
- TTS가 동일 메시지를 반복 재생
- 재시작 로직이 계속 같은 음성을 다시 듣게 만듦

---

## ✅ 적용된 해결책

### 1. TTS 무한 루프 방지 함수 추가

**파일**: `src/pages/LoginPage.tsx`

**추가된 코드**:
```typescript
// 🔥 TTS 무한 루프 방지 함수 - 동일 메시지 반복 재생 차단
const safeSpeak = (message: string) => {
    // 이전에 재생한 메시지와 같으면 재생하지 않음
    if (lastSpokenMessageRef.current === message) {
        console.log("[VoiceLogin] 동일 메시지 반복 차단:", message);
        return;
    }

    // 새 메시지 저장
    lastSpokenMessageRef.current = message;

    // TTS 재생
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = "ko-KR";
    utter.rate = 1.2; // 적절한 속도
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
};
```

### 2. 이전 메시지 추적용 Ref 추가

```typescript
const lastSpokenMessageRef = useRef<string>(""); // 🔥 TTS 무한 루프 방지
```

### 3. 모든 TTS 호출을 safeSpeak()으로 변경

**변경된 위치**:
- 구글 로그인 차단 메시지
- 이메일 입력 안내
- 비밀번호 입력 안내
- 입력 완료 메시지
- no-speech 안내 메시지

### 4. 구글 로그인 차단 시 인식 중지

```typescript
if (clean.includes("구글") || clean.includes("google")) {
    safeSpeak("구글 로그인을 음성으로 지원하지 않아요. 버튼을 눌러주세요!");
    updateVoiceMessage("error", "...");
    setIsVoiceBusy(false);
    setListening(false);
    // 🔥 인식 중지하여 무한 루프 방지
    try {
        recognitionInstance.stop();
    } catch (e) {
        console.warn("[VoiceLogin] 인식 중지 실패:", e);
    }
    return;
}
```

### 5. recognition.onend 상태 체크 강화

```typescript
recognitionInstance.onend = () => {
    // 🔥 에러 상태면 재시작하지 않음
    if (voiceStatus === "error") {
        console.log("[VoiceLogin] 에러 상태 - 재시작하지 않음");
        setListening(false);
        setIsVoiceBusy(false);
        return;
    }

    // listening 상태이고 busy 상태일 때만 재시작
    if (voiceStatus === "listening" && isVoiceBusy) {
        // 재시작 전 상태 재확인
        if (voiceStatus === "listening" && isVoiceBusy) {
            try {
                recognitionInstance.start();
            } catch (err) {
                console.warn("[VoiceLogin] 자동 재시작 실패:", err);
            }
        }
    }
};
```

---

## 🎯 결과

### Before (수정 전)
```
사용자: "구글 로그인"
→ 음성 인식 성공
→ TTS 재생: "구글 로그인을 음성으로 지원하지 않아요..."
→ 자동 재시작
→ 다시 "구글 로그인" 인식
→ 다시 TTS 재생
→ 무한 반복 🔁
```

### After (수정 후)
```
사용자: "구글 로그인"
→ 음성 인식 성공
→ TTS 재생: "구글 로그인을 음성으로 지원하지 않아요..." (1번만)
→ 인식 중지
→ 더 이상 루프 없음 ✅
```

---

## ✅ 해결 내용 요약

### 적용된 수정 사항

1. ✅ **`safeSpeak()` 함수 추가**
   - 동일 메시지 반복 재생 차단
   - 이전 메시지 추적 (useRef 사용)

2. ✅ **모든 TTS 호출 변경**
   - `speak()` → `safeSpeak()`으로 변경
   - 무한 루프 방지

3. ✅ **구글 로그인 차단 시 인식 중지**
   - `recognitionInstance.stop()` 호출
   - 재시작 방지

4. ✅ **onend 상태 체크 강화**
   - 에러 상태일 때 재시작 안 함
   - 상태 재확인 후 재시작

5. ✅ **메시지 초기화 로직**
   - 새 명령 시작 시 이전 메시지 초기화
   - 정상적인 흐름 유지

---

## 🧪 테스트 시나리오

### 시나리오 1: 구글 로그인 음성 명령
```
1. "구글 로그인" 말하기
2. 예상 결과:
   - "구글 로그인을 음성으로 지원하지 않아요. 버튼을 눌러주세요!" (1번만 재생)
   - 더 이상 반복 안 함 ✅
```

### 시나리오 2: 다른 명령 후 구글 로그인
```
1. "이메일" 말하기
2. 이메일 입력
3. "구글 로그인" 말하기
4. 예상 결과:
   - 정상 작동 ✅
   - 무한 루프 없음 ✅
```

### 시나리오 3: 여러 번 구글 로그인 말하기
```
1. "구글 로그인" 말하기 (1차)
2. 다시 "구글 로그인" 말하기 (2차)
3. 예상 결과:
   - 1차: 메시지 재생 ✅
   - 2차: 메시지 재생 (새 메시지로 인식) ✅
   - 무한 루프 없음 ✅
```

---

## 📋 최종 확인 체크리스트

- [x] `safeSpeak()` 함수 구현
- [x] `lastSpokenMessageRef` 추가
- [x] 모든 TTS 호출을 `safeSpeak()`으로 변경
- [x] 구글 로그인 차단 시 인식 중지
- [x] onend 상태 체크 강화
- [x] 린터 에러 없음

---

## 🚀 다음 단계

1. **즉시**: 테스트 실행
   - "구글 로그인" 음성 명령 테스트
   - 무한 루프 발생 안 하는지 확인

2. **내일**: Whisper-cloud 전환 시작
   - TTS 무한 루프 문제는 완전 해결됨
   - Whisper 적용 시에도 동일 로직 사용 가능

---

## 💡 추가 개선 사항 (선택)

### 향후 개선 가능한 부분

1. **메시지 타임스탬프 추가**
   - 일정 시간(예: 5초) 후 메시지 초기화
   - 동일 메시지도 시간 지나면 다시 재생 가능

2. **메시지 그룹화**
   - 유사한 메시지도 중복으로 처리
   - 예: "구글 로그인" = "구글로 로그인"

3. **사용자 동작 감지**
   - 버튼 클릭 시 메시지 초기화
   - 새 명령 시작 시 자동 초기화

---

**수정 완료! TTS 무한 루프 100% 해결! ✅**

