# 1️⃣ 음성 인식 실패 UX 설계 (출시 필수)

## 🎯 목표 한 줄

> **음성이 실패해도
> 사용자는 "내가 잘못했다"는 느낌을 받지 않게 한다.**

❌ "다시 말해주세요"
❌ "인식 실패"
👉 이런 말 **절대 쓰면 안 된다**

---

# 🔥 실패는 3가지 타입만 있다

(이렇게 나눠야 UX가 산다)

---

## ❌ 실패 타입 ①: 아무 소리도 안 들어옴

### 상황

* 사용자가 버튼 눌렀지만 말 안 함
* 너무 작게 말함
* 마이크 권한 없음

### ❌ 하면 안 되는 반응

> "말씀해주세요"
> "음성을 인식하지 못했어요"
> "다시 시도해주세요"

### ✅ 정답 UX

**하단 문구 조용히 원래대로 복귀**

```
🎙️ 말로 장소 찾기
```

📌 **아무 메시지도 띄우지 않는다**
→ 사용자는 실패를 인지하지도 않음

### 구현

```typescript
// 음성 인식 타임아웃 (5초)
if (noSpeechDetected) {
  // 아무것도 하지 않음
  setVoiceState("idle");
  // 메시지 표시 ❌
  // 토스트 ❌
  // 알림 ❌
}
```

---

## ❌ 실패 타입 ②: 말은 했지만 의미 없는 말

### 상황

예:
* "음…"
* "저기…"
* "어…"
* "아…"

### ❌ 하면 안 되는 반응

> "다시 말해주세요"
> "명확하게 말해주세요"
> "인식 실패"

### ✅ 정답 UX (가볍게 예시 제시)

**하단에 한 줄만** (2초 후 자동 사라짐)

```
"근처 축구장" 처럼 말해보세요
```

👉 질문 ❌
👉 명령 ❌
👉 예시만 ⭕

### 구현

```typescript
// 의미 없는 말 감지
if (meaninglessSpeech(text)) {
  // 2초만 표시
  setHintText("\"근처 축구장\" 처럼 말해보세요");
  setTimeout(() => {
    setHintText(null);
    setVoiceState("idle");
  }, 2000);
}
```

### 의미 없는 말 판단 기준

```typescript
function meaninglessSpeech(text: string): boolean {
  const meaningless = ["음", "어", "저기", "아", "그", "이"];
  const words = text.trim().split(/\s+/);
  
  // 단어가 1개 이하
  if (words.length <= 1) return true;
  
  // 의미 없는 단어만
  if (words.every(w => meaningless.includes(w))) return true;
  
  return false;
}
```

---

## ❌ 실패 타입 ③: 말은 명확한데, 결과 없음

### 상황

예:
* "근처 아이스하키장" (데이터 없음)
* "24시간 배드민턴장" (조건 불일치)
* "야외 헬스장" (필터링 결과 없음)

### ❌ 하면 안 되는 반응

> "결과가 없습니다"
> "검색 결과가 없어요"
> "다시 검색해주세요"

### ✅ 정답 UX (지도 중심)

#### 지도

* ❌ 핀 없음
* ❌ 흔들림 없음
* ⭕ 지도 그대로 유지

#### 하단 카드

```
근처에 해당 장소가 없어요
"축구장"이나 "헬스장"은 어때요?
```

👉 **대안 제시 1개만**

### 구현

```typescript
// 검색 결과 없음
if (results.length === 0) {
  // 지도는 그대로
  // 핀 표시 안 함
  
  // 하단 카드만 표시
  setEmptyCard({
    message: "근처에 해당 장소가 없어요",
    suggestion: "\"축구장\"이나 \"헬스장\"은 어때요?",
  });
}
```

### 대안 제시 로직

```typescript
function getAlternativeSuggestion(category: string): string {
  const alternatives: Record<string, string[]> = {
    "아이스하키": ["축구장", "헬스장"],
    "테니스": ["배드민턴장", "축구장"],
    "수영장": ["헬스장", "카페"],
  };
  
  const alts = alternatives[category] || ["축구장", "헬스장"];
  return `"${alts[0]}"이나 "${alts[1]}"은 어때요?`;
}
```

---

# 🧭 실패 UX 공통 원칙 (이거 4개만 지켜라)

## 1. ❌ 실패라는 단어 쓰지 말 것

**금지 단어:**
* "실패"
* "인식 실패"
* "오류"
* "에러"
* "다시"

**대신:**
* 예시 제시
* 대안 제시
* 조용히 복귀

---

## 2. ❌ 사용자를 고치려 하지 말 것

**금지 문구:**
* "다시 말해주세요"
* "명확하게 말해주세요"
* "다시 시도해주세요"

**대신:**
* 예시만 보여줌
* 사용자 탓으로 느껴지지 않게

---

## 3. ⭕ 항상 예시로 말할 것

**패턴:**
```
"근처 축구장" 처럼 말해보세요
```

**구조:**
* 따옴표로 감싼 예시
* "처럼" 또는 "은 어때요?"로 끝

---

## 4. ⭕ 2초 이상 화면 점유하지 말 것

**규칙:**
* 힌트 메시지: 최대 2초
* 카드 메시지: 사용자가 닫을 때까지 (하지만 자동 사라짐 가능)

**타이밍:**
```typescript
// 힌트 메시지
setTimeout(() => {
  setHintText(null);
}, 2000);

// 카드 메시지 (자동 사라짐)
setTimeout(() => {
  setEmptyCard(null);
}, 5000); // 5초 후 자동 사라짐
```

---

# 🎙️ 음성 실패 UX 한 장 요약 (개발용)

| 상황 | 사용자에게 보이는 것 | 지속 시간 |
|------|------------------|---------|
| 말 안 함 | 아무 일도 없던 것처럼 | 즉시 |
| 의미 없음 | "근처 축구장" 예시 | 2초 |
| 결과 없음 | 대안 1개 제안 | 5초 (자동) |

👉 **에러 토스트 ❌**
👉 **모달 ❌**
👉 **알림 ❌**

---

# 💻 구현 예시

## 컴포넌트 구조

```typescript
// 음성 인식 상태
type VoiceState = 
  | "idle"
  | "listening"
  | "processing"
  | "success"
  | "failure_no_speech"
  | "failure_meaningless"
  | "failure_no_results";

// 실패 처리
function handleVoiceFailure(
  state: VoiceState,
  text?: string,
  results?: Place[]
) {
  switch (state) {
    case "failure_no_speech":
      // 타입 ①: 아무것도 안 함
      setVoiceState("idle");
      break;
      
    case "failure_meaningless":
      // 타입 ②: 예시 제시
      setHintText("\"근처 축구장\" 처럼 말해보세요");
      setTimeout(() => {
        setHintText(null);
        setVoiceState("idle");
      }, 2000);
      break;
      
    case "failure_no_results":
      // 타입 ③: 대안 제시
      const suggestion = getAlternativeSuggestion(text);
      setEmptyCard({
        message: "근처에 해당 장소가 없어요",
        suggestion,
      });
      setTimeout(() => {
        setEmptyCard(null);
        setVoiceState("idle");
      }, 5000);
      break;
  }
}
```

---

# ✅ 성공 판정 기준 (중요)

이 질문에 YES 나오면 성공이다.

> ❓ "음성 인식이 안 됐는데
> 짜증났어요?"

* YES → UX 실패
* NO → **출시 OK**

---

## 추가 체크리스트

- [ ] 실패라는 단어 사용 안 함
- [ ] 사용자 탓으로 느껴지지 않음
- [ ] 예시/대안 제시
- [ ] 2초 이상 화면 점유 안 함
- [ ] 에러 토스트/모달 없음
- [ ] 자연스럽게 복귀

---

## 🚀 다음 단계

이제 바로 이어서 진행:

### **2️⃣ 실제 사용자 테스트 스크립트 + 질문지**

* 러닝/운동 사용자 기준
* 15분이면 끝나는 테스트
* **'편하다' 나오는지 확인**
