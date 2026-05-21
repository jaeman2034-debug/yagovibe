# 📈 출시 후 첫 7일 지표 설계

> 이거 아니면 다 보지 마라

---

## ❌ 보지 말 것

- ❌ DAU (Daily Active Users)
- ❌ MAU (Monthly Active Users)
- ❌ 체류 시간
- ❌ 클릭 수
- ❌ 앱 다운로드 수

👉 **이건 나중에 볼 것**

---

## ✅ 반드시 볼 것 (3개)

### ① 음성 버튼 클릭률

> 앱 켠 사람 중
> **말 한 번이라도 했는가**

#### 계산 방법

```
음성 버튼 클릭률 = 음성 버튼 클릭 수 / 앱 실행 수
```

#### 목표

- **40% 이상** → 성공
- **20% 미만** → UX 문제

---

### ② 음성 → 결과 성공률

> 말했을 때
> **지도에 핀 나왔는가**

#### 계산 방법

```
검색 성공률 = 결과 표시 수 / 음성 버튼 클릭 수
```

#### 목표

- **70% 이상** → 성공
- **50% 미만** → STT/검색 로직 문제

---

### ③ 길찾기 클릭률

> 결과 본 사람 중
> **"여기로 가기" 눌렀는가**

#### 계산 방법

```
길찾기 클릭률 = 길찾기 클릭 수 / 결과 표시 수
```

#### 목표

- **20% 이상** → 성공
- **10% 미만** → UX 문제

---

## 🎯 7일 차 성공 판정

이 중 **2개 이상 YES면 성공**이다.

- [ ] 음성 버튼 사용률 > 40%
- [ ] 검색 성공률 > 70%
- [ ] 길찾기 클릭률 > 20%

👉 이러면 **2번(AI/상태)로 넘어갈 자격 생김**

---

## 📊 지표 수집 방법

### 서버 로그 기반 (간단)

#### 이벤트 로깅

```javascript
// App.js
const logEvent = async (event, data) => {
  await fetch(`${API_BASE_URL}/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, data, timestamp: Date.now() }),
  });
};

// 앱 실행
logEvent("app_open");

// 음성 버튼 클릭
logEvent("voice_button_click");

// 검색 성공
logEvent("search_success", { query: text });

// 검색 실패
logEvent("search_failure", { query: text });

// 길찾기 클릭
logEvent("navigation_click", { placeId: place.id });
```

#### 서버 엔드포인트

```javascript
// server/index.js
app.post("/analytics", (req, res) => {
  const { event, data, timestamp } = req.body;
  
  // 간단한 로그 파일 저장
  fs.appendFileSync(
    "analytics.log",
    `${timestamp},${event},${JSON.stringify(data)}\n`
  );
  
  res.json({ success: true });
});
```

---

## 📈 지표 대시보드 (간단 버전)

### 7일 요약

```
앱 실행: 100명
음성 버튼 클릭: 45명 (45%)
검색 성공: 32명 (71%)
길찾기 클릭: 8명 (25%)

판정: 성공 ✅
```

---

## ✅ 체크리스트

- [ ] 이벤트 로깅 구현
- [ ] 서버 로그 수집
- [ ] 7일 후 판정
- [ ] 필요 시 UX 수정

---

## 🧠 핵심 원칙

> **3개 지표만 본다.
> 나머지는 무시한다.**

---

## 🚀 다음 단계

7일 후 지표 확인:
- 성공 판정
- 필요 시 UX 수정
- 2번(AI/상태)로 진행
