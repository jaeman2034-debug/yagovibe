# 🔒 카메라 입력 구현 방식 (FINAL LOCK)

**목적**: 웹에서 카메라를 호출하는 방식 명확히 정의 및 잠금  
**원칙**: 웹 표준 방식 사용, OS 선택에 위임, 브라우저 권한 직접 제어 금지  
**대상**: 개발자 / 모든 이해관계자

---

## 0️⃣ 결론 한 줄

**이 버튼은 '카메라 앱을 직접 켜는 게 아니라 브라우저의 파일 입력(input type="file")을 통해 카메라를 호출'하는 방식으로 작동시킨다.**

**웹에서 이게 유일하게 안전하고 표준적인 방법이다.**

---

## 1️⃣ 작동 원리 (중요)

### 1-1. 기본 구조
```html
<input type="file" accept="image/*" capture="environment" />
```

### 1-2. 모바일 브라우저에서
- 📷 **카메라 앱 실행 옵션이 뜸**
- 🖼 **또는 갤러리 선택 가능**

### 1-3. 데스크탑에서
- 📁 **파일 선택 창만 열림**
- 📷 **카메라 없음 (정상)**

### 1-4. 핵심 원칙
**👉 웹은 OS 권한 없이 카메라를 직접 켤 수 없다. 이게 보안 규칙이다.**

---

## 2️⃣ 구현 정답 (React 기준)

### 2-1. 숨겨진 file input
```tsx
<input
  type="file"
  accept="image/*"
  capture="environment"
  multiple
  ref={fileInputRef}
  className="hidden"
  onChange={handleImageSelect}
/>
```

**속성 설명:**
- `accept="image/*"` → 이미지 파일만 허용
- `capture="environment"` → 후면 카메라 우선 (모바일)
- `multiple` → 여러 장 선택 가능 (선택적)
- `ref={fileInputRef}` → React ref로 접근
- `className="hidden"` → 화면에서 숨김
- `onChange={handleImageSelect}` → 파일 선택 시 핸들러

### 2-2. "이미지 선택" 박스 클릭 시
```tsx
<div
  onClick={() => fileInputRef.current?.click()}
  className="cursor-pointer"
>
  이미지 선택
</div>
```

**👉 이 클릭이 카메라/갤러리를 여는 트리거**

---

## 3️⃣ 실제 사용자 경험

### 3-1. 모바일 (사용자가 박스를 누르면)
```
📷 카메라로 촬영
🖼 갤러리에서 선택
```

**👉 OS가 선택지 제공**

### 3-2. 데스크탑
```
📁 파일 선택 창만 뜸
(카메라 안 뜨는 게 정상)
```

---

## 4️⃣ 하면 안 되는 방식 (천재 모드 금지)

### ❌ getUserMedia()로 카메라 직접 제어

**문제점:**
- 권한 팝업 복잡
- iOS/Safari 불안정
- 상품 등록 UX에 과함

**예시:**
```tsx
// ❌ 하면 안 되는 방식
navigator.mediaDevices.getUserMedia({ video: true })
```

### ❌ 별도 카메라 라이브 뷰

**문제점:**
- 실패 리스크 큼
- UX 복잡도 ↑
- 상품 등록에는 과함

**👉 중고 상품 등록에는 input file이 정답**

---

## 5️⃣ 이미지 선택 이후 흐름 (지금 구조와 딱 맞음)

### 5-1. 흐름 순서
1. 이미지 선택 / 촬영
2. 미리보기 표시
3. 첫 이미지 = 대표 이미지
4. (선택) AI 분석 버튼 활성화

### 5-2. AI UX와의 연결
**👉 이미 설계한 AI UX와 완벽하게 이어짐**

- 이미지 선택 후 → AI 섹션 펼치기 가능
- AI 분석 시작 → 이미지 기반 분석
- 결과 미리보기 → 사용자 승인 후 적용

---

## 6️⃣ 현재 구현 상태 (MarketAddPage.tsx)

### 6-1. File Input
```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handleImageSelect}
  style={{ display: "none" }}
  disabled={saving}
/>
```

### 6-2. 이미지 선택 박스
```tsx
<div
  onClick={() => !saving && fileInputRef.current?.click()}
  style={{
    width: "100%",
    minHeight: 200,
    border: "2px dashed #d1d5db",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: saving ? "not-allowed" : "pointer",
    // ...
  }}
>
  <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
  <div style={{ fontSize: 16, fontWeight: 500 }}>이미지 선택</div>
  <div style={{ fontSize: 12, color: "#6b7280" }}>
    카메라로 촬영하거나 갤러리에서 선택
  </div>
  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
    최대 5장 · 첫 이미지가 대표로 사용돼요
  </div>
</div>
```

### 6-3. 구현 상태 확인
- ✅ `type="file"` 사용
- ✅ `accept="image/*"` 적용
- ✅ `capture="environment"` 적용
- ✅ 숨겨진 input + 클릭 트리거 방식
- ✅ 파일 선택 핸들러 구현

**👉 현재 구현이 정답 구조와 완벽하게 일치함**

---

## 7️⃣ 최종 잠금 규칙

### 🔒 규칙 1: 카메라 = file input 기반
- 브라우저 표준 방식 사용
- `getUserMedia()` 같은 직접 제어 금지

### 🔒 규칙 2: OS 선택에 위임
- 카메라/갤러리 선택은 OS가 제공
- 브라우저가 직접 제어하지 않음

### 🔒 규칙 3: 브라우저 권한 직접 제어 ❌
- 권한 팝업 최소화
- 사용자 경험 단순화

### 🔒 규칙 4: 모바일 최적화는 capture="environment"로 충분
- 추가 복잡도 불필요
- 표준 속성으로 충분

---

## 8️⃣ 검증 체크리스트

### 8-1. 기본 구현
- [ ] `type="file"` 사용
- [ ] `accept="image/*"` 적용
- [ ] `capture="environment"` 적용 (모바일 최적화)
- [ ] 숨겨진 input + 클릭 트리거 방식

### 8-2. 사용자 경험
- [ ] 모바일에서 카메라/갤러리 선택 옵션 제공
- [ ] 데스크탑에서 파일 선택 창 정상 작동
- [ ] 이미지 선택 후 미리보기 표시
- [ ] 파일 크기/타입 검증 적용

### 8-3. 금지 사항 준수
- [ ] `getUserMedia()` 사용하지 않음
- [ ] 카메라 라이브 뷰 구현하지 않음
- [ ] 복잡한 권한 요청 없음

---

## 9️⃣ 한 줄 요약

**"이미지 선택"은 웹에서 카메라를 '직접 켜는 버튼'이 아니라 '카메라를 포함한 파일 선택 트리거'다.**

**이게 가장 안정적이고, 가장 많은 서비스가 쓰는 방식이다.**

---

## 🔟 관련 문서

- `MARKET_ADD_PAGE_UI_LOCK_CHECKLIST.md` - 상품 등록 UI 잠금 체크리스트
- `AI_SECTION_FINAL_LOCK.md` - AI 섹션 최종 잠금 문서
- `MOBILE_SCROLL_FIX_DOCUMENTATION.md` - 모바일 스크롤 문제 해결 문서

---

**이 문서는 카메라 입력 구현 방식을 정의합니다.**  
**모든 이해관계자는 이 방식을 준수해야 합니다.**

