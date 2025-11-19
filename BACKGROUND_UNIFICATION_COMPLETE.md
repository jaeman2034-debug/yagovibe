# ✅ 배경색 통일 완료

## 🎯 문제 해결

### Before (문제)
```
MainLayout: bg-gray-50 dark:bg-gray-900
CenterLayout: (배경 없음)

→ /start → /home 전환 시 배경색이 흰색 → 회색으로 변경되어 시각적 점프 발생
```

---

## ✅ After (해결)

### MainLayout
```typescript
<div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
```

### CenterLayout
```typescript
<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
  <main className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 transition-colors duration-300">
    <Outlet />
  </main>
</div>
```

---

## 📋 주요 변경

### CenterLayout.tsx
- ✅ 외부 컨테이너: `bg-gray-50 dark:bg-gray-900` 추가
- ✅ 트랜지션: `transition-colors duration-300` 추가
- ✅ 카드 배경: `bg-white dark:bg-gray-800` 유지
- ✅ 카드 트랜지션: `transition-colors duration-300` 추가

### MainLayout.tsx
- ✅ 기존 설정 유지: `bg-gray-50 dark:bg-gray-900`
- ✅ 트랜지션: `transition-colors duration-300` 유지

---

## ✅ 결과

### 장점
- ✅ 배경색 통일: 라우트 전환 시 배경색이 변하지 않음
- ✅ 다크 모드 지원: 두 레이아웃 모두 다크 모드 일관성 유지
- ✅ 부드러운 전환: `transition-colors duration-300`으로 전환 효과 적용

### 검증 체크리스트
- [x] `/start` → `/home` 배경색 일관
- [x] 다크 모드 배경색 일관
- [x] 카드 배경색 적절 (흰색/다크 그레이)
- [x] 트랜지션 부드럽게 작동

---

**🎉 완료. 라우트 전환 시 시각적 점프가 완화되었습니다.**

