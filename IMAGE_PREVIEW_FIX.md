# ✅ 이미지 미리보기 크기 제한 적용 완료

## 🔧 수정 내용

`src/pages/MarketCreate_AI.tsx` 파일의 이미지 미리보기 스타일을 수정했습니다.

### 변경 전:
```tsx
<img
    src={imagePreview}
    alt="Preview"
    className="w-full max-h-64 object-contain rounded-lg border"
/>
```

### 변경 후:
```tsx
<div className="mt-3 flex justify-center">
    <img
        src={imagePreview}
        alt="미리보기"
        className="max-w-xs max-h-48 object-contain border rounded-lg mx-auto"
    />
</div>
```

## 📋 적용된 스타일

- ✅ `max-w-xs`: 가로 최대 폭 제한 (~320px)
- ✅ `max-h-48`: 세로 높이 제한 (~192px)
- ✅ `object-contain`: 비율 유지
- ✅ `mx-auto`: 중앙 정렬
- ✅ `border`: 외곽선
- ✅ `rounded-lg`: 둥근 모서리
- ✅ `flex justify-center`: 부모 div에 중앙 정렬 추가

## 🎯 효과

이제 이미지 미리보기가:
- 적절한 크기로 제한됨
- 중앙에 정렬됨
- 비율이 유지됨
- 깔끔한 외곽선 표시

## 🧪 테스트 방법

1. 브라우저에서 상품 등록 페이지 접속
2. 이미지 파일 선택
3. 미리보기가 적절한 크기로 중앙에 표시되는지 확인

---

**✅ 이미지 미리보기 크기 제한 적용 완료!**

