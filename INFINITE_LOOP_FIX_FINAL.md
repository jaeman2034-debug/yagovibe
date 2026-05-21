# 🔧 무한 루프 문제 최종 해결

**작성일**: 2025-12-04  
**문제**: `continuous: true` 모드에서 `onresult`가 반복 호출되어 무한 루프 발생  
**원인**: 같은 텍스트가 여러 번 처리되고, Intent 처리 중에도 `onresult`가 계속 호출됨  
**해결**: 처리된 텍스트 기억, Intent 처리 중 플래그 추가, 중복 처리 방지

---

## 📊 문제 상황

### 발견된 문제
- ❌ **음성인식 중 무한루프가 계속 발생**
- ❌ `continuous: true` 모드에서 `onresult`가 반복 호출됨
- ❌ 같은 텍스트가 여러 번 처리됨
- ❌ Intent 처리 중에도 `onresult`가 계속 호출됨

### 원인 분석
- `continuous: true` 모드에서 `onresult`가 계속 호출됨
- 같은 `finalText`가 여러 번 처리됨
- Intent 처리 중에도 새로운 `onresult` 이벤트가 발생함
- `handleVoiceText`가 반복 호출되어 무한 루프 발생

---

## ✅ 적용된 해결책

### 1. 처리 상태 관리 ref 추가

```typescript
const lastProcessedTextRef = useRef<string>(""); // 🔥 무한 루프 방지: 이전에 처리한 텍스트 기억
const isProcessingRef = useRef<boolean>(false); // 🔥 Intent 처리 중 플래그 (무한 루프 방지)
```

### 2. onresult에서 중복 처리 방지

```typescript
recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
    // 🔥 핵심: TTS 말소리 무시
    if (isSpeaking) {
        console.log("[VoiceLogin] TTS 재생 중 - Recognition 결과 무시");
        return;
    }

    // 🔥 핵심: Intent 처리 중이면 무시 (무한 루프 방지)
    if (isProcessingRef.current) {
        console.log("[VoiceLogin] Intent 처리 중 - Recognition 결과 무시");
        return;
    }

    // 🔥 finalText만 추출 (단순화)
    let finalText = "";
    for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript.trim() + " ";
        }
    }

    const cleanText = finalText.trim();

    // 🔥 finalText가 있을 때만 처리
    if (cleanText) {
        // 🔥 핵심: 이전에 처리한 텍스트와 같으면 무시 (무한 루프 방지)
        if (lastProcessedTextRef.current === cleanText) {
            console.log("[VoiceLogin] 동일 텍스트 반복 차단:", cleanText);
            return;
        }

        // 🔥 처리 플래그 설정
        isProcessingRef.current = true;
        lastProcessedTextRef.current = cleanText;

        // 🔥 핵심: handleVoiceText 함수로 모든 로직 처리
        handleVoiceText(cleanText, recognitionInstance);

        // 🔥 처리 완료 후 플래그 해제 (500ms 딜레이로 중복 처리 방지)
        setTimeout(() => {
            isProcessingRef.current = false;
            // 🔥 2초 후 lastProcessedText 초기화 (같은 명령을 다시 말할 수 있도록)
            setTimeout(() => {
                if (lastProcessedTextRef.current === cleanText) {
                    lastProcessedTextRef.current = "";
                }
            }, 2000);
        }, 500);
    }
};
```

---

## 🎯 동작 흐름

### Before (수정 전 - 무한 루프)
```
"이메일 입력" 인식
→ onresult 트리거
→ handleVoiceText 호출
→ Intent 처리
→ TTS 재생
→ onresult 다시 트리거 (같은 텍스트)
→ handleVoiceText 다시 호출
→ 반복... (무한 루프)
```

### After (수정 후 - 정상 동작)
```
"이메일 입력" 인식
→ onresult 트리거
→ isProcessingRef 체크 (false)
→ lastProcessedTextRef 체크 (다름)
→ isProcessingRef = true
→ lastProcessedTextRef = "이메일 입력"
→ handleVoiceText 호출
→ Intent 처리
→ TTS 재생
→ onresult 다시 트리거 (같은 텍스트)
→ isProcessingRef 체크 (true) → 무시 ✅
→ lastProcessedTextRef 체크 (같음) → 무시 ✅
→ 500ms 후 isProcessingRef = false
→ 2초 후 lastProcessedTextRef 초기화
→ ✅ 정상 동작
```

---

## ✅ 최종 확인 체크리스트

- [x] `lastProcessedTextRef` 추가
- [x] `isProcessingRef` 추가
- [x] `onresult`에서 `isProcessingRef` 체크 추가
- [x] `onresult`에서 `lastProcessedTextRef` 체크 추가
- [x] 처리 완료 후 500ms 딜레이로 플래그 해제
- [x] 2초 후 `lastProcessedTextRef` 초기화 (같은 명령 재사용 가능)
- [x] Debug 로그 추가
- [x] 린터 에러 없음

---

## 💡 핵심 포인트

### 문제의 본질
- ❌ `continuous: true` 모드에서 `onresult`가 반복 호출됨
- ❌ 같은 텍스트가 여러 번 처리됨
- ❌ Intent 처리 중에도 `onresult`가 계속 호출됨

### 해결책의 핵심
1. **`isProcessingRef` 플래그**: Intent 처리 중 추가 결과 무시
2. **`lastProcessedTextRef`**: 이전에 처리한 텍스트 기억
3. **500ms 딜레이**: 중복 처리 방지
4. **2초 후 초기화**: 같은 명령을 다시 말할 수 있도록

---

**수정 완료! 무한 루프가 완전히 해결되었습니다! ✅**
