# 공지 시스템 UX 체크리스트

이 문서는 공지 시스템의 UX 표준을 정의합니다.
대회/시설 등 다른 엔티티에도 동일한 패턴을 적용할 수 있도록 설계되었습니다.

## ✅ 완료된 항목

### 1. 저장 검증
- ✅ 빈 제목/본문 저장 차단
- ✅ 플레이스홀더 저장 차단
- ✅ 제목/본문 최대 길이 제한
- ✅ 실시간 글자 수 표시
- ✅ 경고 메시지 (임박 시)

### 2. UX 개선
- ✅ 저장 중 버튼 disabled
- ✅ 로딩 스피너 추가 (버튼 내부)
- ✅ 성공/실패 Toast 메시지
- ✅ 변경사항 감지 및 Drawer 닫기 확인
- ✅ 로딩 상태 시각화 개선

### 3. 에러 처리
- ✅ 에러 상태 표시
- ✅ 권한 에러 안내
- ✅ 복구 경로 제공

### 4. 코드 구조
- ✅ Validation 유틸리티 분리 (`src/utils/noticeValidation.ts`)
- ✅ 재사용 가능한 로딩 스피너 (`src/components/ui/LoadingSpinner.tsx`)

## 📋 표준 패턴

### 저장 버튼 상태
```typescript
// 저장 중
{saving ? (
  <span className="flex items-center justify-center gap-2">
    <LoadingSpinner size="sm" />
    저장 중...
  </span>
) : (
  "저장"
)}
```

### Validation
```typescript
// 표준 validation 사용
const result = validateNotice(title, content);
if (!result.isValid) {
  showToast(result.error, 'error');
  return;
}
```

### 성공 메시지
```typescript
const message = saveType === "publish"
  ? "✅ 공지가 게시되었습니다."
  : isEditMode
  ? "✅ 공지가 저장되었습니다."
  : "✅ 공지가 등록되었습니다.";
```

### 변경사항 확인
```typescript
const handleClose = () => {
  if (hasUnsavedChanges() && !saving) {
    if (confirm("저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?")) {
      onClose();
    }
  } else {
    onClose();
  }
};
```

## 🔄 대회/시설 적용 시 참고사항

1. **Validation 상수만 수정**: `NOTICE_VALIDATION` → `TOURNAMENT_VALIDATION`
2. **로딩 스피너 재사용**: `LoadingSpinner` 컴포넌트 그대로 사용
3. **변경사항 감지 패턴 동일**: `originalData` state 패턴 그대로 적용
4. **Toast 이벤트 동일**: `showToast` CustomEvent 그대로 사용

## 📝 다음 개선 사항 (선택)

- [ ] 키보드 단축키 (Ctrl+S 저장)
- [ ] 자동 저장 (draft 주기적 저장)
- [ ] 변경사항 표시 인디케이터 (* 표시)
- [ ] 다국어 지원

