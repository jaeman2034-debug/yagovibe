# 🔒 QR 아이콘 터치 → 모바일 QR 모달 오픈 (FINAL SPEC)

## 목표

모바일에서 QR 아이콘을 터치하면 풀스크린(또는 중앙 모달) QR 코드가 뜨고, 다른 사용자가 바로 스캔 가능하게 한다.

---

## 1️⃣ 동작 흐름 (정확히 이 순서)

1. QR 아이콘 터치
2. → QR 모달 열림
3. → QR 코드 크게 표시
4. → 다른 사용자가 스캔
5. → (선택) 스캔 감지 시 자동 닫힘
6. → X 버튼으로 수동 닫기 가능

**금지:**
- 로그인 ❌
- 페이지 이동 ❌
- 설명 화면 ❌

---

## 2️⃣ QR 모달 UI 규칙 (모바일 기준)

### 레이아웃

- 풀스크린 모달 (권장)
- 배경: 흰색
- QR 코드: 화면 중앙
- QR 크기: **240px ~ 300px** (권장: 280px)

```
┌──────────────────┐
│              ✕   │
│                  │
│      ██████      │
│      █  QR █     │
│      ██████      │
│                  │
│  (작은 안내문구) │
└──────────────────┘
```

### 안내 문구 (선택, 아주 작게)

**"이 화면을 스캔하면 바로 둘러볼 수 있어요"**

- font-size: 12px
- color: #6B7280 (Gray-500)

---

## 3️⃣ QR 안에 들어갈 URL (중요)

```
https://your-domain.com/qr?market=home
```

### ⚠️ 주의

- `/login` ❌
- `/` ❌
- 인증 필요 ❌

👉 `/qr` 엔드포인트는 무조건 게스트 허용

---

## 4️⃣ 구현 코드 (현재 적용됨)

### QR 아이콘 클릭

```tsx
const [showQR, setShowQR] = useState(false);

<QrCode onClick={() => setShowQR(true)} />
{showQR && <QROverlay onClose={() => setShowQR(false)} />}
```

### QR 모달 컴포넌트 (QROverlay.tsx)

- 풀스크린 모달 (z-index: 9999)
- 흰색 배경 (#FFFFFF)
- QR 크기: 280px (240px~300px 범위)
- 외부 API 사용 (api.qrserver.com)
- 스캔 감지 자동 종료 (visibilitychange)

---

## 5️⃣ 스캔 감지 시 자동 닫힘 (구현됨)

```tsx
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      onClose();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [onClose]);
```

👉 완벽하지 않아도 UX는 자연스럽다

---

## 6️⃣ 반드시 체크할 QA 포인트

- ✅ QR 아이콘 터치 시 즉시 QR가 뜨는가
- ✅ QR가 충분히 커서 다른 폰에서 바로 인식되는가 (240px~300px)
- ✅ 스캔 후 로그인/가입 화면이 나오지 않는가
- ✅ X 버튼으로 언제든 닫을 수 있는가

**✔ 4개 전부 YES면 실전 합격**

---

## 7️⃣ 닫기 방법

1. 우상단 X 버튼 클릭
2. ESC 키 (데스크톱)
3. 바깥 영역 탭
4. 스와이프 다운 (모바일)
5. 스캔 감지 시 자동 닫힘

---

## 8️⃣ CSS 스타일 (현재 구현)

```css
.qr-overlay {
  position: fixed;
  inset: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.qr-close {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 20px;
  background: none;
  border: none;
  color: #374151;
}

.qr-close:hover {
  color: #111827;
}

.qr-hint {
  margin-top: 16px;
  font-size: 12px;
  color: #6B7280;
}
```

---

## 🧠 천재 모드 핵심 문장 (LOCK)

**"QR은 '클릭해서 쓰는 기능'이 아니라 '보여주기만 하면 끝나는 도구'다."**

지금 이 구현이면:
- ✅ 혼자 써도 OK
- ✅ 친구에게 보여줘도 OK
- ✅ 포스터/현장/카페 전부 OK

---

## 다음 단계

👉 QR로 들어온 게스트에게
"지금은 게스트입니다"를 보여줄까,
아예 아무 표시도 안 할까?

이건 전환율에 직접 영향 준다.

