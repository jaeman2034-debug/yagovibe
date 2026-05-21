# 🔥 Cursor 개발자 수정 지시문: "팀이 없어요" 카드 모바일 레이아웃 수정

## 📋 문제

"팀이 없어요" 카드가 모바일에서 화면 상단에 붙어있어서 **UX가 좋지 않음**.

---

## ✅ 수정 완료

### 변경 사항

1. **ScheduleCreatePage.tsx**
   - `min-h-screen` → `min-h-[70vh]` (화면 전체 높이 대신 70% 사용)
   - `flex items-center justify-center` → `flex flex-col items-center justify-center` (명시적 세로 정렬)
   - `p-4` → `px-4 py-24` (상하 여백 추가)
   - 버튼에 `max-w-[280px] mx-auto` 추가 (모바일 UX 개선)

2. **OpportunitySection.tsx**
   - `mt-6` → `pt-20 pb-6` (상단 여백 증가)

3. **CreateTeamCTA.tsx**
   - `min-h-screen` → `min-h-[70vh]` (화면 전체 높이 대신 70% 사용)
   - `flex items-center justify-center` → `flex flex-col items-center justify-center` (명시적 세로 정렬)
   - `px-4` → `px-4 py-24` (상하 여백 추가)
   - 버튼에 `max-w-[280px] mx-auto` 추가 (모바일 UX 개선)

---

## 🎨 최종 레이아웃 구조

### Before (기존)
```css
.emptyTeamWrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
```

### After (변경 후)
```css
.emptyTeamWrapper {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px 96px 16px; /* 상단 여백 증가 */
}
```

---

## 📋 버튼 스타일 개선

### Before
```css
.emptyTeamButton {
  width: 100%;
}
```

### After
```css
.emptyTeamButton {
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
}
```

**효과**: 모바일에서 버튼이 너무 넓지 않게 제한

---

## 🧪 테스트 체크리스트

- [ ] 모바일에서 "팀이 없어요" 카드가 화면 중앙에 배치되는지 확인
- [ ] 상단 여백이 충분한지 확인 (Header 아래 여유 공간)
- [ ] 버튼이 `max-width: 280px`로 제한되는지 확인
- [ ] 데스크탑에서도 정상 작동하는지 확인

---

## 📝 참고사항

### min-height 조정
- `min-h-screen`: 화면 전체 높이 (모바일에서 너무 큼)
- `min-h-[70vh]`: 화면 높이의 70% (적절한 크기)

### padding 조정
- `py-24`: 상하 96px 여백 (모바일에서 충분한 공간)
- `px-4`: 좌우 16px 여백 (기본 여백)

---

이 수정으로 **"팀이 없어요" 카드가 모바일에서 중앙에 배치**되어 UX가 개선됩니다.
