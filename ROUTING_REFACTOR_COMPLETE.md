# ✅ 라우팅 리팩토링 완료

## 🎯 문제 해결

### Before (문제)
```
/ → CenterLayout + HomePage (카드형, 중복)
/home → MainLayout + HomeNew (대시보드)
/dashboard → CenterLayout + AdminDashboard (카드형, 잘못됨)
```
- 라우트 중복 및 충돌
- 레이아웃 계층 혼란
- 애니메이션 중첩 (AnimatePresence 중복)
- 사용하지 않는 CenterLayoutPro/AppLayoutPro

---

## ✅ After (해결)

### 라우트 계층 명확화

#### CenterLayout (카드형) - 인증/시작 전용
```
<CenterLayout><RouteTransition><Outlet /></RouteTransition></CenterLayout>
  ├─ /start  → StartScreen
  ├─ /login  → LoginPage
  └─ /signup → SignupPage
```

#### MainLayout (대시보드) - 메인 앱 전용
```
<MainLayout>
  ├─ / → HomeNew (루트)
  ├─ /home → HomeNew (호환)
  ├─ /app → /home redirect
  ├─ /app/market → Market
  ├─ /app/team → TeamList
  ├─ /app/admin/* → 관리자 대시보드
  └─ ... 기타 앱 페이지
```

---

## 📋 주요 변경

### App.tsx
- ❌ `AnimatePresence` 제거 (중복 방지)
- ❌ `useLocation` 제거 (중복 방지)
- ❌ 미사용 import 제거 (CenterLayoutPro, AppLayoutPro)
- ❌ `VoiceSignUp` import 제거

### 파일 삭제
- ❌ `src/layouts/CenterLayoutPro.tsx` (사용 안 함)
- ❌ `src/layouts/AppLayoutPro.tsx` (사용 안 함)

### 라우팅 구조
```typescript
Routes
  ├─ CenterLayout + RouteTransition (인증 전용)
  │   ├─ /start
  │   ├─ /login
  │   └─ /signup
  ├─ MainLayout (대시보드 전용)
  │   ├─ /
  │   ├─ /home
  │   ├─ /app/*
  │   └─ ...
  ├─ 풀화면 페이지
  │   ├─ /voice-map
  │   └─ ...
  └─ 404
```

---

## ✅ 결과

### 장점
- ✅ 단일 진입점: `/` → MainLayout
- ✅ 레이아웃 계층 명확: 카드형 vs 대시보드
- ✅ 애니메이션 중복 제거: MainLayout 내부만 사용
- ✅ 코드 정리: 미사용 파일 삭제

### 검증 체크리스트
- [x] `/` → MainLayout 홈
- [x] `/home` → MainLayout 홈
- [x] `/start` → CenterLayout 카드형
- [x] `/login` → CenterLayout 카드형
- [x] `/signup` → CenterLayout 카드형
- [x] `/app/market` → MainLayout 대시보드
- [x] `/app/admin/*` → MainLayout 관리자

---

**🎉 완료. 라우팅을 단순하고 명확하게 리팩토링했습니다.**

