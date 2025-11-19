# ✅ 해결책 실행 계획

## 🎯 필요한 작업 목록

### 1️⃣ SportsHubPage.tsx 생성
- 위치: `src/pages/SportsHubPage.tsx`
- 내용: 제공된 코드 기반
- 레이아웃: MainLayout 사용

### 2️⃣ 카테고리 데이터 생성
- 위치: `src/data/sportsCategories.ts`
- 경로: `/app/*` prefix 유지

### 3️⃣ handleVoice 구현
- 기존: Market.tsx, VoiceMapSearch.tsx 참고
- 완전한 STT + NLU

### 4️⃣ 라우팅 추가
- App.tsx에 `/sports-hub` 추가
- MainLayout 내부에 위치

### 5️⃣ 로그인 후 리다이렉트
- LoginPage.tsx: `/home` → `/sports-hub`
- SignupPage.tsx: `/home` → `/sports-hub`
- StartScreen.tsx: `/home` → `/sports-hub`

### 6️⃣ MainLayout 유지
- 수정하지 않음
- 기존 기능 유지

---

## 🚀 바로 실행할까요?

진행 여부를 알려주세요.

