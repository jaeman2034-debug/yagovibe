# 🔒 FINAL HEADER LAYOUT — ⭐ · BRAND · QR "감싸는 구조"

## 목표 (한 줄)

**YAGO SPORTS를 '중앙 주인공'으로 키우고, 좌우에 ⭐과 ⬜(QR)가 감싸는 구조로 브랜드 신뢰 + 전파 기능을 동시에 완성한다.**

---

## 1️⃣ 최종 시각 구조 (텍스트로 고정)

```
⭐        YAGO SPORTS        ⬜

      AI Platform for Sports Enthusiasts
```

- **YAGO SPORTS**: 가장 크고 강함 (주인공)
- **⭐**: 브랜드 아이덴티티
- **⬜(QR)**: 보조 전파 스위치
- **슬로건**: 한 단계 아래, 작게

👉 **좌우 균형 + 중앙 집중**

---

## 2️⃣ 크기 스케일 LOCK (아주 중요)

### 텍스트

**YAGO SPORTS**
- font-size: **34px** (32–36px 범위)
- font-weight: **800** (700–800 범위)

**AI Platform for Sports Enthusiasts**
- font-size: **13px** (12–14px 범위)
- font-weight: **400**
- opacity: **0.75** (0.7–0.8 범위)

### 아이콘

- **⭐ 아이콘 크기**: **30px** (28–32px 범위)
- **QR 아이콘 크기**: **30px** (⭐와 동일)

**❌ 금지:**
- QR만 튀게 키우기
- ⭐보다 QR 크게 만들기

---

## 3️⃣ 정렬 규칙 (디자인 핵심)

### 상단 라인

**⭐ / YAGO SPORTS / ⬜**
→ 수직 중앙 정렬 (`items-center`)

### 하단 슬로건

**AI Platform for Sports Enthusiasts**
- YAGO SPORTS 기준 중앙 정렬
- 아이콘과 직접 연결 ❌
- (텍스트 덩어리로 인식되게)

---

## 4️⃣ 인터랙션 역할 분리 (LOCK)

### ⭐ 아이콘

- ❌ 클릭 없음
- ❌ 인터랙션 없음
- → **정체성 전용**

### QR 아이콘

- ⭕ 클릭 가능
- ⭕ 풀스크린 QR 오픈
- ⭕ 자동 밝기 / 자동 종료

👉 **같은 크기지만, 다른 역할**

---

## 5️⃣ 실제 CSS 구조 (구현 완료)

```tsx
{/* 중앙: 브랜드 영역 */}
<div className="flex flex-col items-center gap-1 flex-shrink-0">
  {/* 상단 라인: ⭐ YAGO SPORTS ⬜ */}
  <div className="flex items-center gap-3">
    {/* ⭐ 아이콘 (정체성 전용, 클릭 없음) */}
    <Star size={30} />
    
    {/* YAGO SPORTS 텍스트 */}
    <span style={{
      fontSize: '34px',
      fontWeight: 800,
      lineHeight: 1.2
    }}>
      YAGO SPORTS
    </span>
    
    {/* QR 아이콘 (클릭 가능) */}
    <button onClick={() => setShowQR(true)}>
      <QrCode size={30} />
    </button>
  </div>
  
  {/* 하단 슬로건 */}
  <p style={{
    fontSize: '13px',
    fontWeight: 400,
    opacity: 0.75
  }}>
    AI Platform for Sports Enthusiasts
  </p>
</div>
```

---

## 6️⃣ 왜 이 레이아웃이 "천재 설계"냐

### 사용자가 느끼는 인식 순서

1. **아, YAGO SPORTS라는 플랫폼이구나**
2. **(슬로건으로) 뭐 하는 곳인지 이해**
3. **QR 발견 → "아, 이거 보여줄 수 있겠네"**

👉 **QR이 주목을 훔치지 않는다**  
👉 **하지만 필요한 순간 바로 쓸 수 있다**

---

## 7️⃣ 실패 방지 체크리스트

- ✅ 브랜드 텍스트가 가장 크다 (34px, 800)
- ✅ ⭐와 QR 크기가 동일하다 (30px)
- ✅ 슬로건은 한 단계 아래다 (13px, opacity 0.75)
- ✅ QR에 텍스트/설명 없다
- ✅ QR 클릭 시 바로 풀스크린 QR
- ✅ ⭐ 아이콘은 클릭 불가 (정체성 전용)

**✔ 전부 YES면 UI 설계 최종 합격**

---

## 8️⃣ 레이아웃 구조 (전체)

```
┌─────────────────────────────────────────┐
│  [빈 공간]  ⭐ YAGO SPORTS ⬜  [기능]  │
│             AI Platform...              │
└─────────────────────────────────────────┘
```

- **좌측**: 빈 공간 (균형)
- **중앙**: 브랜드 영역 (⭐ · YAGO SPORTS · QR + 슬로건)
- **우측**: 기능 버튼들 (테마 토글, 설치, 로그인/로그아웃)

---

## 9️⃣ 구현 파일

- `src/layout/Header.tsx` - 최종 브랜드 레이아웃 구현
- `src/components/QROverlay.tsx` - 풀스크린 QR 화면

---

## 🧠 천재 모드 핵심 문장 (최종)

**"브랜드는 중앙에서 기억되고, QR은 가장자리에서 전파된다."**

이 레이아웃은 브랜드·UX·바이럴을 동시에 만족하는 구조다.

**이제 이건 더 이상 바꿀 필요 없는 상단 설계다.**

